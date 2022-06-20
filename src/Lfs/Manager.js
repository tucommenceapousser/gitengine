/*
| Manages the large file data.
*/
'use strict';

def.abstract = true;

let _cache;
let _db;
let _semaphore;
let _tokens;

const { Level } = require( 'level' );
const FileData = tim.require( 'Lfs/File/Self' );
const FileGroup = tim.require( 'Lfs/File/Group' );
const Log = tim.require( 'Log/Self' );
const Semaphore = tim.require( 'Util/Semaphore' );
const StringSet = tim.require( 'tim:string/set' );
const Token = tim.require( 'Lfs/Token/Self' );
const TokenGroup = tim.require( 'Lfs/Token/Group' );

/*
| Catalog directory the leveldb database is stored at.
*/
let _catalogDir;

/*
| Sets the catalog dir.
*/
def.static.setCatalogDir = function( cd ) { _catalogDir = cd; };

const dbVersion = 'git-engine-1';

/*
| Checks a user access token (for git-lfs-authenaticate on ssh).
*/
def.static.checkUserToken =
	function( username, tpass )
{
	let token = _tokens.get( username );
	if( !token || token.expired( ) ) return false;
	return token.token === tpass;
};

/*
| Announces a download.
|
| ~oid: object id.
| ~size: size of the object.
*/
def.static.download =
	async function( oid, size )
{
/**/if( CHECK )
/**/{
/**/	if( arguments.length !== 2 ) throw new Error( );
/**/	if( typeof( oid ) !== 'string' ) throw new Error( );
/**/	if(	typeof( size ) !== 'number' ) throw new Error( );
/**/	if( size !== Math.trunc( size) ) throw new Error( );
/**/	if( size <= 0 ) throw new Error( );
/**/}

	const handle = oid + ':' + size;
	// FUTURE prepare streamer
	return await Self.getLfData( handle );
};

/*
| True if LFS is enabled.
*/
def.static.enabled = function( ) { return !!_catalogDir; };

/*
| Gets a lfData object.
|
| ~handle: string in format of oid:size
*/
def.static.getLfData =
	async function( handle )
{
	let lfData = _cache.get( handle );

	if( lfData !== undefined ) return lfData;

	// -- semaphored --
	const flag = await _semaphore.request( );
	try{ lfData = await _db.get( 'obj:' + handle ); }
	catch( e )
	{
		if( !e.notFound ) throw e;
		lfData = false;
	}
	if( lfData ) lfData = FileData.FromJson( JSON.parse( lfData ) );
	_cache = _cache.set( handle, lfData );
	_semaphore.release( flag );
	// --
	return lfData;
};

/*
| Gets a user access token (for git-lfs-authenaticate on ssh).
*/
def.static.getUserToken =
	function( username )
{
	let token = _tokens.get( username );

	if( token && !token.expired( ) ) token = token.refresh( );
	else token = Token.Generate( );

	_tokens = _tokens.set( username, token );
	return token;
};

/*
| Sets a lfData object.
*/
def.static.setLfData =
	async function( lfData )
{
	const handle = lfData.handle;
	const flag = await _semaphore.request( );
	_cache = _cache.set( handle, lfData );
	await _db.put( 'obj:' + handle, lfData.jsonfy( ) );
	_semaphore.release( flag );
};

/*
| Initalizes the lfs manager.
*/
def.static.start =
	async function( )
{
	if( !_catalogDir )
	{
		Log.log( 'lfs', '*', 'no LFS catalog configured, disabling LFS' );
		return;
	}

	if( !FileData.getObjectsDir( ) ) throw new Error( 'LFS objects dir not configured' );

	Log.log( 'lfs', '*', 'starting' );

	_db = new Level( _catalogDir );
	await _db.open( );
	let version;

	try { version = await _db.get( 'version' ); }
	catch( e )
	{
		if( !e.notFound ) throw e;
		Log.log( 'lfs', '*', 'creating catalog' );
		version = dbVersion;
		await _db.put( 'version', dbVersion );
	}

	if( version !== dbVersion ) throw new Error( 'unexpected catalog version' );

	_cache = FileGroup.Empty;
	_semaphore = Semaphore.create( );
	_tokens = TokenGroup.Empty;
};

/*
| Announces an upload.
|
| ~oid: object id.
| ~size: size of the object.
| ~repoName: repository name this belongs to.
*/
def.static.upload =
	async function( oid, size, repoName )
{
/**/if( CHECK )
/**/{
/**/	if( arguments.length !== 3 ) throw new Error( );
/**/	if( typeof( repoName ) !== 'string' ) throw new Error( );
/**/}

	const handle = oid + ':' + size;
	let lfData = await Self.getLfData( handle );
	if( lfData )
	{
		// this object is not yet known to be part of that repository
		if( !lfData.repositories.has( repoName ) )
		{
			lfData = lfData.create( 'repositories', lfData.repositories.add( repoName ) );
			await Self.setLfData( lfData );
		}
		// already uploaded or already batched.
		return lfData;
	}

	lfData =
		FileData.create(
			'oid', oid,
			'repositories', StringSet.Elements( repoName ),
			'size', size,
		);

	await Self.setLfData( lfData );
	return lfData;
};
