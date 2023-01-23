/*
| Handles ajax requests.
*/
'use strict';

def.abstract = true;

const nodegit = require( 'nodegit' );

const Access = tim.require( 'Yagit/Server/Access' );
const FileTypes = tim.require( 'timberman:FileTypes' );
const Https = tim.require( 'Https/Self' );
const LfsManager = tim.require( 'Lfs/Manager' );
const RepositoryManager = tim.require( 'Repository/Manager' );

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

	const ngBlob = await subEntry.getBlob( );

	const subPathStr = path.chopn( 3 ).string;
	let filter;
	try
	{
		filter = await nodegit.Attr.get( ngRepo, 4, subPathStr, 'filter' );
	}
	catch( e )
	{
		console.log( 'Error on Attr.get in LFS check' );
		console.log( e );
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
