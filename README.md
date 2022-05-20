# gitengine

A multiuser git server for node.js with HTTPS, SSH, CGIT and LFS.
Gitengine runs a single unix user, thus avoiding file-permission issues in more complicated permission setups.

This is just "the engine", there is no web based management interface bundled.
See https://gitlab.com/csc1/gitengine/-/tree/examples for an example using a single setup script.
More complicated setups a possible with on the fly permission changes, repository additions etc. but not included with gitengine.

## Getting started

Install to a node project with
```
npm install gitengine
```

In a node file run
```
const gitengine = require( 'gitengine' );
```
gitengine is currently using CommonJS, ES6 modules not yet done.

## API documentation

### gitengine.config( )

Global gitengine configuration is done with gitengine.config( ) call.
An arbitrary number of arguments can be specified starting by a configuration option and a number options specific to that configuration.

Configuration arguments are:

- ```'httpPort' [number]```  
Sets the http port to listen to (it will only forward traffic to https).  
Set 'false' to disable.  
default: 80

- ```'httpsPort'   [number],```   
Sets the https port to listen to.  
Set false to disable.  
default: 443

- ```'ip'     [string]```  
Sets the IP to listen to.  
default: '0.0.0.0'  

- ```'ips'    [ [string], [string], .. ]```  
Sets multiple IPs to listen to.  
default: [ '0.0.0.0' ]  

- ```'lfsCatalogDir'   [string]```  
Sets the LFS catalog dir (leveldb).  
default: disabled

- ```'lfsObjectsDir'  [string]```  
Sets the LFS objects dir.  
default: disabled

- ```'receiveCallBack'   [function]```  
Calls this function after git-receive (where actual commits have been transferred)  
If used "git-receive-plug" from ccode needs to be placed in /usr/local/bin/ and
```/var/run/gitengine``` must be created and accessible to gitengine.  
default: disable

- ```sshHostKeys' [ [sshHostKey] [sshHostKey] ]```  
Sets host ssh key(s).  
default: none. Needs to be provided. (suggested reading in your keys in /etc/ssh/ and make them available to gitengine)

- ```'sshPort'   [number],```  
Sets the ssh port to listen to.  
default: 22

- ```'sslCertFile'   [string],```  
Path to SSL cert file.  
default: none. Needs to be provided. 
Generate a https self signed key like this:  
```
openssl req -newkey rsa:4096 -x509 -sha256 -days 3650 -nodes -outhost.crt -keyout host.key
```
Or use a real one.

- ```'sslKeyFile'   [string],```  
Path to SSL key file.  
See sslCertFile.

### gitengine.addUser( )

Adds an user to gitengine.

Arguments are:

- ```'group'    [string]```  
Adds the user to this group.

- ```'password' [string]```  
Adds a plain password for this user.

- ```'passhash' ['ldap'/'shadow'] [string]```  
Adds a ldap/shadow hashed password for this user.  
You can create shadow hashes with ```openssl passwd -6```.  
Only type 6 for shadow and {SSHA} password from LDAP are supported.

- ```'sshkey'   [string]```  
Adds a sshkey for this user.

- ```'username' [string]```  
Username of the user.  
Required.

Obviously you want at least either a password or a sshkey for every user.

#### gitengine.addRepository( )

Adds a repository.

Arguments are:

- ```'description'   [STRING]```  
Description of the repository (shown in CGIT).

- ```'group'         [STRING] ["r" or "rw"]``` 
Adds a groups permission to this repository (read only or read/write).

- ```'name'          [STRING]```  
Unique name of the repository (handle for gitengine).  
Required.

- ```'path'          [STRING]```  
Path of the repository on local filesystem.  
Required.

- ```'user'          [STRING]```  
Adds a user permission to this repository (read only or read/write).

### async gitengine.createRepositories( )

Creates missing git repositories on disk.

### gitEngine.removeRepository( name )

Removes the repository from gitengine with the 'name' handle.
It will not be deleted from disk!

### gitEngine.removeUser( username)

Removes that user.

### gitEngine.repositories( )

Returns immutable data of all repositories handled by gitengine.

### gitEngine.users( )

Returns immutable data of all repositories handled by gitengine.

### async gitEngine.readBranches( )

Reads in info of all branchse of all repositories.
This is not actually cared for by gitengine, but made available via the repositories( ) call
for an application caring about that.

### async gitEngine.start( )

Starts the gitengine. Most calls to gitEngine.config( ) will have no effect after this.
Altough repositories and users can still be added or removed.

## Example

See https://gitlab.com/csc1/gitengine/-/tree/examples for an example using a single setup script.
