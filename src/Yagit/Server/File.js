/*
| Handles ajax requests.
*/
'use strict';

def.abstract = true;

const nodegit = require( 'nodegit' );

const Https = tim.require( 'Https/Self' );
const RepositoryManager = tim.require( 'Repository/Manager' );

/*
| Handles a file request.
*/
def.static.handle =
	async function( request, result, path )
{
	// XXX AUTHENTICATION!!

	const parts = path.parts;

	const plen = parts.length;
	if( plen < 3 )
	{
		return Https.error( result, 404, 'file request too short' );
	}

/**/if( CHECK && parts.get( 0 ) !== 'file' ) throw new Error( );

	const repoName = parts.get( 1 );
	const repo = RepositoryManager.get( repoName );
	if( !repo )
	{
		return Https.error( result, 404, 'repository unknown' );
	}

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

	const ngBlob = await subEntry.getBlob( );
	result.writeHead( 200, { } );
	result.end( ngBlob.content( ) );
};
