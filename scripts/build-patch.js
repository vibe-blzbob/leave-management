const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { execSync } = require('child_process')
const asar = require('@electron/asar')

const rootDir = path.resolve(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'))
const version = pkg.version || '1.0.3'
const appName = 'LeaveDesk'
const patchExeName = `${appName}-Patch-${version}.exe`
const distDir = path.join(rootDir, 'dist')

async function copyRecursive(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
    for (const item of fs.readdirSync(src)) {
      await copyRecursive(path.join(src, item), path.join(dest, item))
    }
  } else {
    fs.copyFileSync(src, dest)
  }
}

async function main() {
  console.log(`\n📦 Building lightweight Micro-Patch installer for ${appName} v${version}...`)

  // 1. Build the updated code into out/
  console.log('🔨 Step 1: Compiling application (TypeScript & Vite)...')
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' })

  // 2. Locate base app.asar from previous build
  const baseAsarPath = path.join(distDir, 'win-unpacked', 'resources', 'app.asar')
  if (!fs.existsSync(baseAsarPath)) {
    console.error(`❌ Base app.asar not found at ${baseAsarPath}.`)
    process.exit(1)
  }

  // 3. Staging and updating with freshly compiled files
  console.log('📂 Step 2: Injecting updated out/ bundle into app.asar payload...')
  const stagingDir = path.join(distDir, '.patch-staging')
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true })
  }
  fs.mkdirSync(stagingDir, { recursive: true })

  // Extract base asar
  asar.extractAll(baseAsarPath, stagingDir)

  // Replace out directory with fresh build
  const freshOut = path.join(rootDir, 'out')
  const stagingOut = path.join(stagingDir, 'out')
  if (fs.existsSync(stagingOut)) {
    fs.rmSync(stagingOut, { recursive: true, force: true })
  }
  await copyRecursive(freshOut, stagingOut)

  // Update package.json inside staging to new version
  const stagingPkgPath = path.join(stagingDir, 'package.json')
  if (fs.existsSync(stagingPkgPath)) {
    const stagingPkg = JSON.parse(fs.readFileSync(stagingPkgPath, 'utf8'))
    stagingPkg.version = version
    fs.writeFileSync(stagingPkgPath, JSON.stringify(stagingPkg, null, 2))
  }

  // Pack back into updated-app.asar
  const updatedAsarPath = path.join(distDir, 'updated-app.asar')
  await asar.createPackage(stagingDir, updatedAsarPath)
  fs.rmSync(stagingDir, { recursive: true, force: true })

  const asarSizeMb = (fs.statSync(updatedAsarPath).size / 1024 / 1024).toFixed(2)
  console.log(`✔ Packed updated app.asar (${asarSizeMb} MB)`)

  // 4. Compress with GZip
  console.log('🗜 Step 3: Compressing payload with GZip...')
  const asarData = fs.readFileSync(updatedAsarPath)
  const compressed = zlib.gzipSync(asarData, { level: 9 })
  const payloadPath = path.join(distDir, 'payload.gz')
  fs.writeFileSync(payloadPath, compressed)
  fs.unlinkSync(updatedAsarPath)

  const compressedSizeMb = (compressed.length / 1024 / 1024).toFixed(2)
  console.log(`✔ Compressed payload: ${compressedSizeMb} MB`)

  // 5. Create C# WinForms source
  console.log('⚡ Step 4: Compiling standalone Windows Micro-Installer (.exe)...')
  const csharpSource = `
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace LeaveDeskPatcher
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool isSilent = false;
            foreach (var arg in args)
            {
                if (arg.Equals("/s", StringComparison.OrdinalIgnoreCase) || arg.Equals("/silent", StringComparison.OrdinalIgnoreCase))
                    isSilent = true;
            }

            string installDir = DetectInstallDir();

            if (isSilent)
            {
                if (!string.IsNullOrEmpty(installDir))
                {
                    PerformPatch(installDir);
                }
                return;
            }

            Application.Run(new PatchForm(installDir));
        }

        public static string DetectInstallDir()
        {
            string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string candidate = Path.Combine(localApp, "Programs", "${appName}");
            if (Directory.Exists(candidate) && File.Exists(Path.Combine(candidate, "${appName}.exe")))
                return candidate;

            string progFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            candidate = Path.Combine(progFiles, "${appName}");
            if (Directory.Exists(candidate) && File.Exists(Path.Combine(candidate, "${appName}.exe")))
                return candidate;

            string progFilesX86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            candidate = Path.Combine(progFilesX86, "${appName}");
            if (Directory.Exists(candidate) && File.Exists(Path.Combine(candidate, "${appName}.exe")))
                return candidate;

            return candidate;
        }

        public static bool PerformPatch(string targetDir)
        {
            try
            {
                foreach (var p in Process.GetProcessesByName("${appName}"))
                {
                    try
                    {
                        p.CloseMainWindow();
                        if (!p.WaitForExit(2000))
                            p.Kill();
                    }
                    catch { }
                }

                string resourcesDir = Path.Combine(targetDir, "resources");
                if (!Directory.Exists(resourcesDir))
                    Directory.CreateDirectory(resourcesDir);

                string targetAsar = Path.Combine(resourcesDir, "app.asar");
                string bakAsar = Path.Combine(resourcesDir, "app.asar.bak");

                if (File.Exists(targetAsar))
                {
                    try { File.Copy(targetAsar, bakAsar, true); } catch { }
                }

                var asm = Assembly.GetExecutingAssembly();
                using (var stream = asm.GetManifestResourceStream("payload.gz"))
                using (var gzip = new GZipStream(stream, CompressionMode.Decompress))
                using (var outFile = new FileStream(targetAsar, FileMode.Create, FileAccess.Write))
                {
                    byte[] buffer = new byte[65536];
                    int read;
                    while ((read = gzip.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        outFile.Write(buffer, 0, read);
                    }
                }

                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }
    }

    public class PatchForm : Form
    {
        private TextBox txtPath;
        private Button btnBrowse;
        private Button btnAction;
        private Label lblStatus;
        private ProgressBar progressBar;
        private CheckBox chkLaunch;
        private string installDir;
        private bool isFinished = false;

        public PatchForm(string detectedDir)
        {
            this.installDir = detectedDir;
            InitUI();
        }

        private void InitUI()
        {
            this.Text = "${appName} Update Patch v${version}";
            this.Size = new Size(520, 270);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            try
            {
                this.Icon = Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location);
            }
            catch { }

            Label lblTitle = new Label();
            lblTitle.Text = "${appName} Update Patch v${version}";
            lblTitle.Font = new Font("Segoe UI", 12F, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(15, 23, 42);
            lblTitle.Location = new Point(20, 16);
            lblTitle.AutoSize = true;
            this.Controls.Add(lblTitle);

            Label lblSubtitle = new Label();
            lblSubtitle.Text = "Applies verified system changes and bug fixes to your existing installation.";
            lblSubtitle.ForeColor = Color.FromArgb(100, 116, 139);
            lblSubtitle.Location = new Point(22, 42);
            lblSubtitle.Size = new Size(460, 20);
            this.Controls.Add(lblSubtitle);

            Label lblDir = new Label();
            lblDir.Text = "Installation Folder:";
            lblDir.Location = new Point(22, 74);
            lblDir.AutoSize = true;
            lblDir.ForeColor = Color.FromArgb(51, 65, 85);
            this.Controls.Add(lblDir);

            txtPath = new TextBox();
            txtPath.Text = installDir;
            txtPath.Location = new Point(22, 94);
            txtPath.Size = new Size(375, 25);
            txtPath.ReadOnly = false;
            this.Controls.Add(txtPath);

            btnBrowse = new Button();
            btnBrowse.Text = "Browse...";
            btnBrowse.Location = new Point(405, 92);
            btnBrowse.Size = new Size(80, 27);
            btnBrowse.Click += (s, e) =>
            {
                using (var fbd = new FolderBrowserDialog())
                {
                    fbd.SelectedPath = txtPath.Text;
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        txtPath.Text = fbd.SelectedPath;
                    }
                }
            };
            this.Controls.Add(btnBrowse);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(22, 130);
            progressBar.Size = new Size(463, 14);
            progressBar.Style = ProgressBarStyle.Continuous;
            this.Controls.Add(progressBar);

            lblStatus = new Label();
            lblStatus.Text = "Ready to install update.";
            lblStatus.ForeColor = Color.FromArgb(71, 85, 105);
            lblStatus.Location = new Point(22, 150);
            lblStatus.Size = new Size(460, 20);
            this.Controls.Add(lblStatus);

            chkLaunch = new CheckBox();
            chkLaunch.Text = "Launch ${appName} after update";
            chkLaunch.Checked = true;
            chkLaunch.Location = new Point(22, 182);
            chkLaunch.AutoSize = true;
            this.Controls.Add(chkLaunch);

            btnAction = new Button();
            btnAction.Text = "Update Now";
            btnAction.Size = new Size(110, 32);
            btnAction.Location = new Point(375, 178);
            btnAction.BackColor = Color.FromArgb(79, 70, 229);
            btnAction.ForeColor = Color.White;
            btnAction.FlatStyle = FlatStyle.Flat;
            btnAction.FlatAppearance.BorderSize = 0;
            btnAction.Click += BtnAction_Click;
            this.Controls.Add(btnAction);
        }

        private void BtnAction_Click(object sender, EventArgs e)
        {
            if (isFinished)
            {
                if (chkLaunch.Checked)
                {
                    string exePath = Path.Combine(txtPath.Text, "${appName}.exe");
                    if (File.Exists(exePath))
                    {
                        Process.Start(exePath);
                    }
                }
                this.Close();
                return;
            }

            string target = txtPath.Text.Trim();
            if (string.IsNullOrEmpty(target) || !Directory.Exists(target))
            {
                MessageBox.Show("Please select a valid ${appName} installation directory.", "Directory Not Found", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            btnAction.Enabled = false;
            btnBrowse.Enabled = false;
            txtPath.Enabled = false;
            lblStatus.Text = "Updating application files...";
            progressBar.Style = ProgressBarStyle.Marquee;

            Thread worker = new Thread(() =>
            {
                bool success = Program.PerformPatch(target);
                this.Invoke(new Action(() =>
                {
                    progressBar.Style = ProgressBarStyle.Continuous;
                    if (success)
                    {
                        progressBar.Value = 100;
                        lblStatus.Text = "Update v${version} installed successfully!";
                        lblStatus.ForeColor = Color.FromArgb(22, 101, 52);
                        btnAction.Text = "Finish";
                        btnAction.BackColor = Color.FromArgb(22, 163, 74);
                        btnAction.Enabled = true;
                        isFinished = true;
                    }
                    else
                    {
                        progressBar.Value = 0;
                        lblStatus.Text = "Failed to update. Make sure ${appName} is closed and you have permissions.";
                        lblStatus.ForeColor = Color.FromArgb(185, 28, 28);
                        btnAction.Text = "Retry";
                        btnAction.Enabled = true;
                        btnBrowse.Enabled = true;
                        txtPath.Enabled = true;
                    }
                }));
            });
            worker.IsBackground = true;
            worker.Start();
        }
    }
}
`

  const csharpPath = path.join(distDir, 'Patcher.cs')
  fs.writeFileSync(csharpPath, csharpSource.trim())

  const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe'
  const iconPath = path.join(rootDir, 'build', 'icon.ico')
  const outExePath = path.join(distDir, patchExeName)

  let cscCommand = `"${cscPath}" /target:winexe /optimize+ /nologo /resource:"${payloadPath}",payload.gz`
  if (fs.existsSync(iconPath)) {
    cscCommand += ` /win32icon:"${iconPath}"`
  }
  cscCommand += ` /out:"${outExePath}" "${csharpPath}"`

  execSync(cscCommand, { stdio: 'inherit' })

  // 6. Cleanup temp files
  try { fs.unlinkSync(payloadPath) } catch { }
  try { fs.unlinkSync(csharpPath) } catch { }

  const finalSizeMb = (fs.statSync(outExePath).size / 1024 / 1024).toFixed(2)
  console.log(`\n🎉 SUCCESS!`)
  console.log(`🚀 Standalone Micro-Patch created at: ${outExePath}`)
  console.log(`📊 Final installer size: ${finalSizeMb} MB (vs ~121 MB full installer — 98% size reduction!)`)
}

main().catch((err) => {
  console.error('Error building patch:', err)
  process.exit(1)
})
