/*
| Returns the diffs of a commit (to it's parent).
*/
'use strict';

def.abstract = true;

const nodegit = require( 'nodegit' );

const Access = ti2c.require( 'Yagit/Server/Access' );
const Diffs = ti2c.require( 'Yagit/Commit/Diffs/Self' );
const DiffsList = ti2c.require( 'Yagit/Commit/Diffs/List' );
const Https = ti2c.require( 'Https/Self' );
const Hunk = ti2c.require( 'Yagit/Commit/Patch/Hunk/Self' );
const HunkList = ti2c.require( 'Yagit/Commit/Patch/Hunk/List' );
const Line = ti2c.require( 'Yagit/Commit/Patch/Hunk/Line/Self' );
const LineList = ti2c.require( 'Yagit/Commit/Patch/Hunk/Line/List' );
const Patch = ti2c.require( 'Yagit/Commit/Patch/Self' );
const PatchList = ti2c.require( 'Yagit/Commit/Patch/List' );
const RepositoryManager = ti2c.require( 'Repository/Manager' );

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
	const ngDiffs = await ngCommit.getDiff( );
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

	const headers = { };
	// 28 days caching (git commit version shouldn't ever change)
	headers[ 'Cache-Control' ] = 'max-age=2419200';
	headers[ 'Content-Type' ] = 'application/json';
	headers[ 'Date' ] = new Date().toUTCString( );

	result.writeHead( 200, headers );
	result.end( reply.jsonfy( ) );
};
