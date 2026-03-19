const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: '155.212.188.131',
      username: 'root',
      password: '!!G2Zxp5XI*l'
    });
    console.log('Connected!');

    const { stdout, stderr } = await ssh.execCommand('docker stop 4f706a0ea53b ddd05e7eceef && docker rm 4f706a0ea53b ddd05e7eceef && systemctl start nginx && systemctl status nginx');
    console.log('STDOUT:');
    console.log(stdout);
    if (stderr) {
      console.log('STDERR:');
      console.log(stderr);
    }
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    ssh.dispose();
  }
}

run();