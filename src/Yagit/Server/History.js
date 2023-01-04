/*
| Handles history requests.
*/
'use strict';

def.abstract = true;

const nodegit = require( 'nodegit' );

const Commit = tim.require( 'Yagit/Commit/Self' );
const CommitList = tim.require( 'Yagit/Commit/List' );
const CommitRef = tim.require( 'Yagit/Commit/Ref/Self' );
const CommitRefList = tim.require( 'Yagit/Commit/Ref/List' );
const Http = tim.require( 'Yagit/Server/Http' );
const ReplyHistory = tim.require( 'Yagit/Reply/History' );
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
		return Http.webError( result, 404, 'request too short' );
	}

/**/if( CHECK && parts.get( 0 ) !== 'history' ) throw new Error( );

	const repoName = parts.get( 1 );
	const repo = RepositoryManager.get( repoName );
	if( !repo )
	{
		return Http.webError( result, 404, 'repository unknown' );
	}

	if( plen > 3 )
	{
		return Http.webError( result, 404, 'not supported' );
	}

	const partCommitSha = parts.get( 2 );
	const ngRepo = await nodegit.Repository.open( repo.path );

	let ngCommitStart;
	try{ ngCommitStart = await ngRepo.getCommit( partCommitSha ); }
	catch( e )
	{
		return Http.webError( result, 404, 'invalid commit' );
	}

	const revWalk = ngRepo.createRevWalk( );
	revWalk.sorting( nodegit.Revwalk.SORT.TIME );
	revWalk.push( ngCommitStart.id( ) );
	//await revWalk.fastWalk( 30 );
	const ngCommits = await revWalk.getCommits( Number.POSITIVE_INFINITY );

	// lookup table for shas in the commit;
	const lookup = { };
	let c = 0;
	for( let ngCommit of ngCommits )
	{
		lookup[ ngCommit.sha( ) ] = c++;
	}

	// initial fill of the commit list
	const commits = [ ];
	c = 0;
	for( let ngCommit of ngCommits )
	{
		const ngSignature = ngCommit.author( );
		const authorName = ngSignature.name( );
		const date = ngCommit.date( ).getTime( );
		const message = ngCommit.message( );
		const sha = ngCommit.sha( );

		const parents = [ ];
		const ngParents = ngCommit.parents( );
		for( let pOid of ngParents )
		{
			const pSha = pOid.tostrS( );
			const pOffset = lookup[ pSha ];
			parents.push(
				CommitRef.create(
					'sha', pSha,
					'offset', pOffset,
				)
			);
		}

		const commit =
			Commit.create(
				'authorName', authorName,
				'date', date,
				'graphLevel', 0,
				'message', message,
				'parents', CommitRefList.Array( parents ),
				'sha', sha,
			);
		commits.push( commit );
	}

	// calculates graph levels
	for( let c = 0, clen = commits.length; c < clen; c++ )
	{
		const commit = commits[ c ];
		for( let pc of commit.parents )
		{
			const pOffset = pc.offset;
			if( typeof( pOffset ) !== 'number' ) continue;

			for( let cc = c + 1; cc < pOffset; cc++ )
			{
				const co = commits[ cc ];
				if( co.graphLevel >= commit.graphLevel )
				{
					commits[ cc ] = co.create( 'graphLevel', co.graphLevel + 1 );
				}
			}
		}
	}

	// fills in parent graphLevel information
	for( let c = 0, clen = commits.length; c < clen; c++ )
	{
		const commit = commits[ c ];
		const parents = [ ];
		for( let p of commit.parents )
		{
			parents.push(
				p.create( 'graphLevel', commits[ p.offset ].graphLevel )
			);
		}
		commits[ c ] = commit.create( 'parents', CommitRefList.Array( parents ) );
	}

	const reply =
		ReplyHistory.create(
			'commits', CommitList.Array( commits ),
			'offset', 0,
			'repository', repoName,
			'total', ngCommits.length,
		);

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
