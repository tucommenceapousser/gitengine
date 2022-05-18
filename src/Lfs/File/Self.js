/*
| The data about a large file.
*/
'use strict';

def.attributes =
{
	// object id
	oid: { type: 'string', json: true, },

	// repositories using the file
	repositories: { type: 'tim:string/set', json: true, },

	// size of the file
	size: { type: 'number', json: true, },

	// true if it has been uploaded
	uploaded: { type: 'boolean', defaultValue: 'false', json: true, },

	// upload data stream in progress
	_upstream: { type: [ 'undefined', 'protean' ] },
};

def.json = 'LargeFileData';

const fs = require( 'fs' );
const stream = require( 'stream' );
const zlib = require( 'zlib' );

const LfsManager = tim.require( 'GitEngine/Lfs/Manager' );
const RepositoryManager = tim.require( 'GitEngine/Repository/Manager' );

let _objectsDir;

def.static.setObjectsDir = function( od ) { _objectsDir = od; };

/*
| Returns the objects dir.
*/
def.static.getObjectsDir = ( ) => _objectsDir;

/*
| Returns true if oid/size are okay.
*/
def.static.checkOidSize =
	function( oid, size )
{
	if( typeof( oid ) !== 'string' || !/[0-9a-f]/.test( oid )  )
	{
		console.log( 'invalid oid' );
		return false;
	}
	if(
		typeof( size ) !== 'number'
		|| size !== Math.trunc( size )
		|| size <= 0
	)
	{
		console.log( 'invalid size' );
		return false;
	}
	return true;
};

/*
| Provides a download for the large file.
*/
def.proto.download =
	function( req, res )
{
	if( !this.uploaded ) return false;
	const rStream = fs.createReadStream( _objectsDir + this.handle + '.gz' );

	// directly stream gzipped
	if( req.headers[  'accept-encoding' ] === 'gzip' )
	{
		console.log( 'down-streaming gzip' );
		res.writeHead( '200', { 'Content-Encoding': 'gzip' } );
		rStream.on(
			'finish', ( ) =>
			{
				console.log( 'finished down-streaming: ', this.handle );
				res.end( );
			}
		);
		rStream.pipe( res );
	}
	else
	{
		console.log( 'down-streaming verbatim' );
		res.writeHead( '200', { } );
		stream.pipeline( rStream, zlib.createGunzip( ), res,
			( err ) => { if( err ) console.log( 'down-streaming error', err ); }
		);
	}
};

/*
| Handle of large file.
*/
def.lazy.handle = function( ) { return this.oid + ':' + this.size; };

/*
| Sees what permissions the 'user' has on this file.
|
| ~user: user object.
|
| ~return: 'rw', 'r' or false.
*/
def.proto.getPermissions =
	function( user )
{
	let perms = false;
	for( let repoName of this.repositories )
	{
		const repo = RepositoryManager.get( repoName );
		if( !repo ) continue;
		const rperms = repo.getPermissions( user );
		if( !rperms ) continue;
		if( !perms || perms.length < rperms.length ) perms = rperms;
	}
	return perms;
};

/*
| Provides an upload for the large file.
*/
def.proto.upload =
	function( req, res )
{
	if( this.uploaded ) return false;

	// in case there is already an upstream to this uid in progress abort it.
	if( this._upstream ) this._upstream.destroy( );

	const wStream = fs.createWriteStream( _objectsDir + this.handle + '.gz' );
	const gzip = zlib.createGzip( );
	LfsManager.setLfData( this.create( '_upstream', wStream ) );

	stream.pipeline( req, gzip, wStream,
		( err ) =>
		{
			if( err )
			{
				console.log( 'up-streaming error', err );
				return;
			}
			console.log( 'finished uploading: ', this.handle );
			if( gzip.bytesWritten !== this.size )
			{
				console.log( 'up-streaming wrong file size!' );
				return;
			}
			LfsManager.setLfData( this.create( 'uploaded', true, '_upstream', undefined ) );
			res.writeHead( '200', { } );
			res.end( );
		}
	);
};
