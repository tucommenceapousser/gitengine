/*
| Overleaf operations
*/
const axios = require( 'axios' );
const axiosCookieJarSupport = require( 'axios-cookiejar-support' ).wrapper;
const io = require( '../lib/socket.io-client/lib/io' );
const formData = require( 'form-data' );
const tough = require( 'tough-cookie' );

def.attributes =
{
	// the overleaf server url.
	url: { type: 'string' },

	// the underlying axios client.
	_axios: { type: 'protean' },
};

/*
| Uploads an entity (doc or file) to an overleaf server.
*/
def.proto.addFolder =
	async function( project_id, folder_id, name )
{
	const ax = this._axios._;
	const res = await ax.post(
		this.url + '/project/' + project_id + '/folder',
		{ parent_folder_id: folder_id, name: name }
	);
	return res;
};

/*
| Helper for buildTree.
*/
/*
const buildTree =
	function( folder, branch )
{
	branch.type = 'folder';
	branch.id = folder._id;
	branch.name = folder.name;
	const subs = branch.subs = { };
	for( let e of folder.docs )
	{
		const name = e.name;
		const doc = subs[ name ] = { };
		doc.type = 'doc';
		doc.id = e._id;
		doc.name = name;
		doc.branch = branch;
	}
	for( let e of folder.fileRefs )
	{
		const name = e.name;
		const doc = subs[ name ] = { };
		doc.type = 'file';
		doc.id = e._id;
		doc.name = name;
		doc.branch = branch;
	}
	for( let e of folder.folders )
	{
		const subBranch = subs[ e.name ] = { };
		buildTree( e, subBranch );
		subBranch.branch = branch;
	}
};
*/

/*
| Rebuilds a rootFolder returned by joinProject into a filename based tree
*/
/*
def.static.buildTree =
	function( rootFolder )
{
	const tree = { };
	buildTree( rootFolder, tree );
	return tree;
};
*/

/*
| Downloads a project as a zip file.
*/
def.proto.downloadZip =
	async function( project_id )
{
	const ax = this._axios._;
	const res = await ax.get(
		this.url + '/Project/' + project_id + '/download/zip',
		{ responseType: 'arraybuffer' }
	);
	return res.data;
};

/*
| Gets the project page
| and more importantly sets the csrf token.
*/
def.proto.getProjectPage =
	async function( project_id )
{
	const ax = this._axios._;
	if( !project_id ) project_id = '';
	const res = await ax.get( this.url + '/project/' );
	const regexMETA = /<meta name="ol-csrfToken" content="([^"]*)"/;
	const csrf = res.data.match( regexMETA )[ 1 ];
	ax.defaults.headers.common[ 'x-csrf-token' ] = csrf;
};

/*
| Makes the real-time operations to join a project
| using socket io.
|
| ~project_id: project_id to joint.
| ~count: client counter.
*/
def.proto.joinProject =
	async function( project_id, count )
{
	const ax = this._axios._;
	console.log( count, 'io connect to', project_id );
	const cookieJar = ax.defaults.jar;
	const cookie = cookieJar.getCookieStringSync( this.url );
	const socket = io.connect(
			this.url,
			{
				withCredentials: true,
				cookie: cookie,
				transports: [ 'websocket' ],
				'force new connection': true,
			}
		);
	let project;

	// this is a bad workaround, sometimes socket.io just doesn't seem to reply
	// (or reply to a previous connection, there are some fixes in newer versions it seems)
	// after a timeout just try again. Promise logic should discard the respective other event
	// should it occour.
	while( !project )
	{
		const promise = new Promise( ( resolve, reject ) => {
			socket.emit(
				'joinProject',
				{ 'project_id': project_id },
				( self, res, owner, number ) => resolve( res )
			);
			setTimeout( ( ) => resolve( undefined ), 1000 );
		} );
		project = await promise;
		if( !project ) console.log( count, '*** timeout on socket.io, retrying' );
	}
	console.log( count, 'iosocket disconnect' );
	socket.disconnect( );
	return project;
};

/*
| Performs a login.
|
| ~email: email to login as
| ~password: password to login as
*/
def.proto.login =
	async function( email, password )
{
	const ax = this._axios._;
	const res = await ax.get( this.url + '/login' );
	const data = res.data;
	const regexCSRF = /input name="_csrf" type="hidden" value="([^"]*)">/;
	const csrf = data.match( regexCSRF )[ 1 ];
	await ax.post(
		this.url + '/login',
		{ _csrf: csrf, email: email, password: password }
	);
};

/*
| Logs out an overleaf session.
*/
def.proto.logout =
	async function( )
{
	const ax = this._axios._;
	const res = await ax.get( this.url + '/logout' );
	const regexCSRF = /input name="_csrf" type="hidden" value="([^"]*)">/;
	let csrf = res.data.match( regexCSRF )[ 1 ];
	await ax.post( this.url + '/logout', { '_csrf': csrf } );
};

/*
| Deletes a doc, file or folder.
|
| ~type: doc/file/folder
| ~entitity_id: entity id
*/
def.proto.remove =
	async function( project_id, type, entity_id )
{
	const ax = this._axios._;
	switch( type )
	{
		case 'doc':
		case 'file':
		case 'folder':
			await ax.delete(
				this.url + '/project/' + project_id + '/' + type + '/' + entity_id
			);
			return;
		default: throw new Error( );
	}
};

/*
| Uploads an entity (doc or file) to an overleaf server.
*/
def.proto.upload =
	async function( project_id, folder_id, filename, data )
{
	const ax = this._axios._;
	const fd = new formData();
	fd.append( 'qqfile', data, filename );
	try
	{
		await ax.post(
			this.url + '/project/' + project_id + '/upload?folder_id=' + folder_id,
			fd,
			{ headers: fd.getHeaders( ) }
		);
	}
	catch( e )
	{
		throw new Error( e.response.status + ' ' + e.response.statusText );
	}
};

/*
| Creates a new axios client to connect to overleaf.
*/
def.static.Url =
	function( url )
{
	const cookieJar = new tough.CookieJar( );
	const ax = axiosCookieJarSupport( axios.create( { jar: cookieJar } ) );
	return(
		Self.create(
			'url', url,
			'_axios', { _: ax },
		)
	);
};

