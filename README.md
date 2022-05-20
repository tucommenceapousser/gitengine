This example assumed you are running the daemon as user ```git``` belonging to group ```git```.

```
sudo apt install git cgit 
git clone --branch examples https://gitlab.com/csc1/gitengine.git gitengine-examples
cd gitengine-examples
npm install
cd ssl
openssl req -newkey rsa:4096 -x509 -sha256 -days 3650 -nodes -out host.crt -keyout host.key
cd ../ssh
sudo cp /etc/ssh/ssh_host* .
sudo chown git.git *
cd ..
node plain/plain.js
```

Now you can clone on another machine.

```
git clone https://[YOURHOST]:8443/repo-one.git 
```
using "usera" and "foobar" for authentication.

or
```
git clone ssh://userc@[YOURHOST]:8022/repo-two.git  
```
if you replaced the ssh-key in plain/plain.js with your public key.

If you want to use standard ports 80, 443 for http/https use authbind.  
Edit plain/plain.js ```'httpsPort'``` and ```httpPort``` to 443 and 80.

You can also view the CGIT interface at ```https://[YOURHOST]:8443/``` using a browser, again with "usera" and "foobar" to authenticate.

```
sudo apt install authbind
sudo touch /etc/authbind/byport/80 /etc/authbind/byport/443
sudo chmod +x /etc/authbind/byport/80 /etc/authbind/byport/443
sudo chown git.git /etc/authbind/byport/80 /etc/authbind/byport/443
authbind node plain/plain.js
```

If you want to use standard ports 22 for ssh, first move the standard ssh daemon to a nonstandard port and use authbind as well.  
Edit plain/plain.js ```'sshPort'``` to 22.

```
sudo nano /etc/ssh/sshd_config
```
Change it to run for example at:  
Port 222

```
sudo systemctl restart sshd
sudo apt install authbind
sudo touch /etc/authbind/byport/22
sudo chmod +x /etc/authbind/byport/22
sudo chown git.git /etc/authbind/byport/22
authbind node plain/plain.js
```

