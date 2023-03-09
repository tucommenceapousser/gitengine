/*
| Handles ajax requests.
*/
'use strict';

def.abstract = true;

const nodegit = require( 'nodegit' );

const Access = ti2c.require( 'Yagit/Server/Access' );
const FileTypes = ti2c.require( 'ti2c-web:FileTypes' );
const Https = ti2c.require( 'Https/Self' );
const LfsManager = ti2c.require( 'Lfs/Manager' );
const Log = ti2c.require( 'Log/Self' );
const RepositoryManager = ti2c.require( 'Repository/Manager' );

/*
| Gets the content type for 'filename'.
*/
def.static.contentType =
	function( filename )
{
	filename = filename.toLowerCase( );
	const iod = filename.lastIndexOf( '.' );
	if( iod < 0 ) return;
	const ext = filename.substr( iod + 1 );

	try
	{
		return FileTypes.mime( ext );
	}
	catch( e )
	{
		// ignore, return undefined
	}
};

/*
| Handles a file request.
*/
def.static.handle =
	async function( request, result, path )
{
	const parts = path.parts;
	const plen = parts.length;
	if( plen < 3 )
	{
		return Https.error( result, 404, 'file request too short' );
	}

/**/if( CHECK && parts.get( 0 ) !== 'file' ) throw new Error( );

	const repoName = parts.get( 1 );

	if( !Access.test( request, result, repoName ) ) return;

	const repo = RepositoryManager.get( repoName );
	// repo must exist otherwise access would have denied

	const partCommitSha = parts.get( 2 );
	const ngRepo = await nodegit.Repository.open( repo.path );

	let ngCommit;
	try
	{
		ngCommit = await ngRepo.getCommit( partCommitSha );
	}
	catch( e )
	{
		return Https.error( result, 404, 'invalid commit' );
	}

	let ngTree = await ngCommit.getTree( );
	let subEntry;

	for( let p = 3; ; )
	{
		const part = parts.get( p );

		try{ subEntry = await ngTree.getEntry( part ); }
		catch( e )
		{
			return Https.error( result, 404, 'invalid path' );
		}

		if( ++p >= plen ) break;

		if( !subEntry.isTree( ) )
		{
			return Https.error( result, 404, 'invalid path' );
		}

		ngTree = await subEntry.getTree( );
	}

	if( subEntry.isTree( ) )
	{
		return Https.error( result, 404, 'path is a dir' );
	}

	const contentType = Self.contentType( parts.last );
	const headers = { };
	if( contentType ) headers[ 'Content-Type' ] = contentType;

	// 28 days caching (git commit version shouldn't ever change)
	headers[ 'Cache-Control' ] = 'max-age=2419200';

	let ngBlob = await subEntry.getBlob( );

	const subMode = subEntry.filemode( );
	if( subMode & 8192 )
	{
		Log.log( 'yagit', '#', 'is a symlink' );
		// FIXME currently only handled in directory symlinks
		const linkPath = '' + ngBlob.content( );

		try
		{
			subEntry = await ngTree.getEntry( linkPath );
			ngBlob = await subEntry.getBlob( );
		}
		catch( e )
		{
			Log.log( 'yagit', '#', 'cannot follow symlink' );
			return Https.error( result, 404, 'cannot follow symlink' );
		}
	}

	const subPathStr = path.chopn( 3 ).string;
	let filter;
	try
	{
		filter = await nodegit.Attr.get( ngRepo, 4 + 8, subPathStr, 'filter' );
	}
	catch( e )
	{
		try
		{
			filter = await nodegit.Attr.get( ngRepo, 4, subPathStr, 'filter' );
		}
		catch( e )
		{
			Log.log( 'yagit', '#', 'Error on Attr.get in LFS check', e );
		}
	}

	// pseudo 1-time loop to break of from.
	while( filter === 'lfs' )
	{
		const size = ngBlob.rawsize( );

		// if larger than 1024 certainly not LFS.
		if( size > 1024 ) break;

		const cStr = await ngBlob.toString( );
		const lines = cStr.split( '\n' );
		if( lines < 3 ) break;
		if( lines[ 0 ] !== 'version https://git-lfs.github.com/spec/v1' ) break;

		const l2Parts = lines[ 1 ].split( ' ' );
		if( l2Parts < 2 ) break;
		if( l2Parts[ 0 ] !== 'oid' ) break;
		const lfsOid = l2Parts[ 1 ];

		const oidParts = lfsOid.split( ':' );
		if( oidParts.length < 2 ) break;

		const l3Parts = lines[ 2 ].split( ' ' );
		if( l3Parts[ 0 ] !== 'size' ) break;
		if( l3Parts < 2 ) break;
		const lfsSize = l3Parts[ 1 ];

		// it's a LFS object alright
		const lfData = await LfsManager.getLfData( oidParts[ 1 ] + ':' + lfsSize );
		if( !lfData ) break;

		return lfData.download( '#', request, result, headers );
	}

	result.writeHead( 200, headers );
	result.end( ngBlob.content( ) );
};
