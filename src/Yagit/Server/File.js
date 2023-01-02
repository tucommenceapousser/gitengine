/*
| Handles ajax requests.
*/
'use strict';

def.abstract = true;

const nodegit = require( 'nodegit' );

const Http = tim.require( 'Yagit/Server/Http' );

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
		return Http.webError( result, 404, 'file request too short' );
	}

/**/if( CHECK && parts.get( 0 ) !== 'file' ) throw new Error( );

	if( parts.get( 1 ) !== 'SFB' )
	{
		return Http.webError( result, 404, 'repository unknown' );
	}

	const partCommitSha = parts.get( 2 );
	const repoPath = '/home/axel/git/SFB/.git';
	const ngRepo = await nodegit.Repository.open( repoPath );

	let ngCommit;
	try{ ngCommit = await ngRepo.getCommit( partCommitSha ); }
	catch( e )
	{
		return Http.webError( result, 404, 'invalid commit' );
	}

	let ngTree = await ngCommit.getTree( );
	let subEntry;

	for( let p = 3; ; )
	{
		const part = parts.get( p );

		try{ subEntry = await ngTree.getEntry( part ); }
		catch( e )
		{
			return Http.webError( result, 404, 'invalid path' );
		}

		if( ++p >= plen ) break;

		if( !subEntry.isTree( ) )
		{
			return Http.webError( result, 404, 'invalid path' );
		}
		ngTree = await subEntry.getTree( );
	}

	if( subEntry.isTree( ) )
	{
		return Http.webError( result, 404, 'path is a dir' );
	}

	const ngBlob = await subEntry.getBlob( );
	result.writeHead( 200, { } );
	result.end( ngBlob.content( ) );
};
