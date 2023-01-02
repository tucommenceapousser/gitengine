/*
| Handles dir requests.
*/
'use strict';

def.abstract = true;

const nodegit = require( 'nodegit' );

const DirEntry = tim.require( 'Yagit/Dir/Entry/Self' );
const DirEntryList = tim.require( 'Yagit/Dir/Entry/List' );
const Http = tim.require( 'Yagit/Server/Http' );
const ReplyDir = tim.require( 'Yagit/Reply/Dir' );

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
		return Http.webError( result, 404, 'request too short' );
	}

/**/if( CHECK && parts.get( 0 ) !== 'dir' ) throw new Error( );

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

	for( let p = 3; p < plen ; p++ )
	{
		try{ subEntry = await ngTree.getEntry( parts.get( p ) ); }
		catch( e )
		{
			return Http.webError( result, 404, 'invalid path' );
		}

		if( !subEntry.isTree( ) )
		{
			return Http.webError( result, 404, 'invalid path' );
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
