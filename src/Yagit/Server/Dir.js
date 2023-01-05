/*
| Handles dir requests.
*/
'use strict';

def.abstract = true;

const nodegit = require( 'nodegit' );

const DirEntry = tim.require( 'Yagit/Dir/Entry/Self' );
const DirEntryList = tim.require( 'Yagit/Dir/Entry/List' );
const Https = tim.require( 'Https/Self' );
const ReplyDir = tim.require( 'Yagit/Reply/Dir' );
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
		return Https.error( result, 404, 'request too short' );
	}

/**/if( CHECK && parts.get( 0 ) !== 'dir' ) throw new Error( );

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

	for( let p = 3; p < plen ; p++ )
	{
		try{ subEntry = await ngTree.getEntry( parts.get( p ) ); }
		catch( e )
		{
			return Https.error( result, 404, 'invalid path' );
		}

		if( !subEntry.isTree( ) )
		{
			return Https.error( result, 404, 'invalid path' );
		}
		ngTree = await subEntry.getTree( );
	}

	const ngEntries = ngTree.entries( );
	let list = [ ];
	for( let ne of ngEntries )
	{
		let type;
		if( ne.isTree( ) ) type = 'dir';
		else
		{
			const ngBlob = await ne.getBlob( );
			type = ngBlob.isBinary( ) ? 'binary' : 'text';
		}

		const de =
			DirEntry.create(
				'name', ne.name( ),
				'type', type,
			);

		list.push( de );
	}

	const reply = ReplyDir.create( 'entries', DirEntryList.Array( list ) );
	result.writeHead( 200, { } );
	result.end( reply.jsonfy( ) );
};
