/*
| Returns the diffs of a commit (to it's parent).
*/
'use strict';

def.abstract = true;

const nodegit = require( 'nodegit' );

const Access = tim.require( 'Yagit/Server/Access' );
const Diffs = tim.require( 'Yagit/Commit/Diffs/Self' );
const DiffsList = tim.require( 'Yagit/Commit/Diffs/List' );
const Https = tim.require( 'Https/Self' );
const Hunk = tim.require( 'Yagit/Commit/Patch/Hunk/Self' );
const HunkList = tim.require( 'Yagit/Commit/Patch/Hunk/List' );
const Line = tim.require( 'Yagit/Commit/Patch/Hunk/Line/Self' );
const LineList = tim.require( 'Yagit/Commit/Patch/Hunk/Line/List' );
const Patch = tim.require( 'Yagit/Commit/Patch/Self' );
const PatchList = tim.require( 'Yagit/Commit/Patch/List' );
const RepositoryManager = tim.require( 'Repository/Manager' );

/*
| Handles a file request.
*/
def.static.handle =
	async function( request, result, path )
{
	const parts = path.parts;

	const plen = parts.length;
	if( plen !== 3 )
	{
		return Https.error( result, 404, 'invalid request length' );
	}

/**/if( CHECK && parts.get( 0 ) !== 'diffs' ) throw new Error( );

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

	const diffsList = [ ];
	const ngDiffs = ( await ngCommit.getDiff( ) );
	for( let ngDiff of ngDiffs )
	{
		// needed to detect moves
		await ngDiff.findSimilar( {
			flags: nodegit.Diff.FIND.RENAMES
		} );

		const ngPatches = await ngDiff.patches( );

		const patches = [ ];
		for( let ngPatch of ngPatches )
		{
			const ngHunks = await ngPatch.hunks( );
			const hunks = [ ];
			for( let ngHunk of ngHunks )
			{
				//const oldLines = hunk.oldLines( );
				//const newLines = hunk.newLines( );
				//const oldStart = hunk.oldStart( );
				//const newStart = hunk.newStart( );

				const ngLines = await ngHunk.lines( );
				const lines = [ ];
				for( let ngLine of ngLines )
				{
					lines.push(
						Line.create(
							'oldLineno', ngLine.oldLineno( ),
							'newLineno', ngLine.newLineno( ),
							'content', ngLine.content( )
						)
					);
				}

				hunks.push(
					Hunk.create(
						'lines', LineList.Array( lines )
					)
				);
			}

			patches.push(
				Patch.create(
					'newFile',
						ngPatch.isDeleted( )
						? undefined
						: ngPatch.newFile( ).path( ),
					'oldFile',
						ngPatch.isAdded( )
						? undefined
						: ngPatch.oldFile( ).path( ),
					'hunks', HunkList.Array( hunks ),
				)
			);
		}

		diffsList.push(
			Diffs.create( 'patches', PatchList.Array( patches ) )
		);
	}

	const reply = DiffsList.Array( diffsList );
	result.writeHead(
		200,
		{
			'content-type': 'application/json',
			'cache-control': 'no-cache', // FIXME
			'date': new Date().toUTCString()
		}
	);
	result.end( reply.jsonfy( ) );
};
