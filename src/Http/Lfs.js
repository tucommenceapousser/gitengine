/*
| Provides the http(s) interface for git repositories.
| Does both forwarding git requests as well provides a cgit web interface.
*/

def.abstract = true;

const FileData = tim.require( 'Lfs/File/Self' );
const Http = tim.require( 'Http/Self' );
const LfsManager = tim.require( 'Lfs/Manager' );

/*
| Serves a git LFS request on an info/lfs url
|
| urlSplit[ 2 ] must be 'info' and urlSplit[ 3 ] must be 'lfs'
| for this to be called.
*/
def.static.info =
	async function( req, res, urlSplit, repoName, person, perms )
{
	if( urlSplit[ 4 ] === 'objects' && urlSplit[ 5 ] === 'batch' )
	{
		if( req.method !== 'POST' ) return Http.error( res, 405, 'method not allowed' );
		Self._post( req, res, urlSplit, repoName, person, perms );
		return;
	}

	return Http.error( res, 501, 'not implemented' );
};

/*
| Serves a git LFS request on an object url
*/
def.static.object =
	async function( req, res, urlSplit, person )
{
	const handle = urlSplit[ 2 ];
	const lfData = await LfsManager.getLfData( handle );
	if( !lfData ) return Http.error( res, 404, 'file not found' );
	let perms = lfData.getPermissions( person );
	if( req.method === 'PUT' )
	{
		if( perms !== 'rw' ) return Http.error( res, 401, 'unauthorized' );
		return lfData.upload( req, res );
	}
	if( req.method !== 'GET ' )
	{
		if( !perms ) return Http.error( res, 401, 'unauthorized' );
		return lfData.download( req, res );
	}
	return Http.error( res, 405, 'method not allowed' );
};

/*
| Handles a request on the batch API.
*/
def.static._batch =
	async function( req, res, urlSplit, repoName, person, perms, data )
{
	const json = JSON.parse( data );

	if( urlSplit[ 4 ] === 'objects' && urlSplit[ 5 ] === 'batch' )
	{
		const operation = json.operation;
		switch( operation )
		{
			case 'download':
				return Self._batchDownload( req, res, urlSplit, repoName, person, perms, json );
			case 'upload':
				return Self._batchUpload( req, res, urlSplit, repoName, person, perms, json );
			default:
				return Http.error( res, 400, 'invalid request' );
		}
	}
	else
	{
		return Http.error( res, 404, 'file not found' );
	}
};

/*
| Handles a download request on the batch API.
*/
def.static._batchDownload =
	async function( req, res, urlSplit, repoName, person, perms, json )
{
	const reqObjs = json.objects;
	if( !Array.isArray( reqObjs ) ) return Self._result( res, { objects:null } );

	const resObjs = [ ];
	for( let obj of reqObjs )
	{
		const oid = obj.oid;
		const size = obj.size;
		if( !FileData.checkOidSize( oid, size ) ) continue;

		const lfData = await LfsManager.download( oid, size );
		const resObj =
		{
			oid: obj.oid,
			size: obj.size,
			actions:
			{
				download:
				{
					href: 'https://' + req.headers.host + '/objects/' + lfData.handle,
					header:
					{
						'Accept': 'application/vnd.git-lfs',
						'Authorization': req.headers.authorization,
						// FIXME expires_at
					}
				}
			}
		};
		resObjs.push( resObj );
	}
	return Self._result( res, { objects: resObjs } );
};

/*
| Handles an upload request on the batch API.
*/
def.static._batchUpload =
	async function( req, res, urlSplit, repoName, person, perms, json )
{
	if( perms !== 'rw' ) return Http.error( res, 404, 'cannot upload with readonly permissions' );

	const reqObjs = json.objects;
	if( !Array.isArray( reqObjs ) ) return Self._result( res, { objects:null } );

	const resObjs = [ ];
	for( let obj of reqObjs )
	{
		const oid = obj.oid;
		const size = obj.size;
		if( !FileData.checkOidSize( oid, size ) ) continue;

		const lfData = await LfsManager.upload( oid, size, repoName );
		// FIXME handle case if already uploaded
		let resObj = { oid: obj.oid, size: size };
		if( !lfData.uploaded )
		{
			resObj.actions =
			{
				upload:
				{
					href: 'https://' + req.headers.host + '/objects/' + lfData.handle,
					header:
					{
						'Accept': 'application/vnd.git-lfs',
						'Authorization': req.headers.authorization,
						// FIXME expires_at
					},
					'Accept-Encoding': 'gzip, identity',
				}
			};
		}
		resObjs.push( resObj );
	}
	return Self._result( res, { objects: resObjs } );
};

/*
| Aquires a post request.
*/
def.static._post =
	function( req, res, urlSplit, repoName, person, perms )
{
	const data = [ ];
	req.on( 'close', ( ) => {
		Self._batch( req, res, urlSplit, repoName, person, perms, data.join( '' ) );
	} );
	req.on( 'data', ( chunk ) => { data.push( chunk ); } );
};

/*
| Returns a result.
*/
def.static._result =
	function( res, json )
{
	res.writeHead( '200', { 'Content-Type': 'application/vnd.git-lfs+json' } );
	res.end( JSON.stringify( json ) );
};
