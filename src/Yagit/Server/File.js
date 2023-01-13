/*
| Handles ajax requests.
*/
'use strict';

def.abstract = true;

const nodegit = require( 'nodegit' );

const Access = tim.require( 'Yagit/Server/Access' );
const FileTypes = tim.require( 'timberman:FileTypes' );
const Https = tim.require( 'Https/Self' );
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
	try{ ngCommit = await ngRepo.getCommit( partCommitSha ); }
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

	const ngBlob = await subEntry.getBlob( );
	result.writeHead( 200, headers );
	result.end( ngBlob.content( ) );
};
