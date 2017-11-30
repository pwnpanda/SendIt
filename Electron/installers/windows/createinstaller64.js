const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller
const path = require('path')

getInstallerConfig()
  .then(createWindowsInstaller)
  .catch((error) => {
    console.error(error.message || error)
    process.exit(1)
  })

function getInstallerConfig () {
  console.log('creating windows installer');
  const rootPath = path.join(__dirname, '/../..');
  const outPath = path.join(rootPath, 'release');
  //console.log("out: " + outPath);
  //console.log("dir: " + path.join(outPath, 'SendIt-win32-x64'));
  //console.log("outDir: " + path.join(outPath, 'windows-installer-64'));

  return Promise.resolve({
    appDirectory: path.join(outPath, 'SendIt-win32-x64'),
    authors: 'RobinLunde',
    noMsi: true,
    outputDirectory: path.join(outPath, 'windows-installer-64'),
    exe: 'SendIt.exe',
    setupExe: 'SendItInstaller.exe',
    iconUrl: path.join(rootPath, 'Icon.ico'),
    setupIcon: path.join(rootPath, 'Icon.ico')
  })
}