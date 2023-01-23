/*
| Handles history requests.
|
| FIXME cache history graphs.
*/
'use strict';

def.abstract = true;

const nodegit = require( 'nodegit' );

const Access = tim.require( 'Yagit/Server/Access' );
const Commit = tim.require( 'Yagit/Commit/Self' );
const CommitList = tim.require( 'Yagit/Commit/List' );
const CommitRef = tim.require( 'Yagit/Commit/Ref/Self' );
const CommitRefList = tim.require( 'Yagit/Commit/Ref/List' );
const Https = tim.require( 'Https/Self' );
const ReplyHistory = tim.require( 'Yagit/Reply/History' );
const RepositoryManager = tim.require( 'Repository/Manager' );

/*
| Handles a file request.
*/
def.static.handle =
	async function( request, result, path )
{
	const parts = path.parts;

	const plen = parts.length;
	if( plen !== 5 )
	{
		return Https.error( result, 404, 'invalid history request' );
	}

/**/if( CHECK && parts.get( 0 ) !== 'history' ) throw new Error( );

	const repoName = parts.get( 1 );
	const partCommitSha = parts.get( 2 );
	const pStartAt = parts.get( 3 );
	const pStopAt = parts.get( 4 );
	let startAt = parseInt( pStartAt, 10 );
	let stopAt;

	if( pStartAt !== '' + startAt || startAt < 0 )
	{
		return Https.error( result, 404, 'invalid start at' );
	}

	if( pStopAt !== 'all' )
	{
		stopAt = parseInt( pStopAt, 10 );
		if( pStopAt !== '' + stopAt || stopAt < 0 )
		{
			return Https.error( result, 404, 'invalid stop at' );
		}

		if( stopAt <= startAt )
		{
			return Https.error( result, 404, 'invalid start stop range' );
		}
	}

	if( !Access.test( request, result, repoName ) ) return;

	const repo = RepositoryManager.get( repoName );
	// repo must exist otherwise access would have denied

	const ngRepo = await nodegit.Repository.open( repo.path );

	let ngCommitStart;
	try{ ngCommitStart = await ngRepo.getCommit( partCommitSha ); }
	catch( e )
	{
		return Https.error( result, 404, 'invalid commit' );
	}

	const revWalk = ngRepo.createRevWalk( );
	revWalk.sorting( nodegit.Revwalk.SORT.TIME );
	revWalk.push( ngCommitStart.id( ) );
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

	let rCommits = commits.slice( startAt, pStopAt === 'all' ? Number.Infinity : stopAt );

	const reply =
		ReplyHistory.create(
			'commits', CommitList.Array( rCommits ),
			'offset', startAt,
			'repository', repoName,
			'total', ngCommits.length,
		);

	const headers = { };
	// 28 days caching (git commit version shouldn't ever change)
	headers[ 'Cache-Control' ] = 'max-age=2419200';
	headers[ 'Content-Type' ] = 'application/json';
	headers[ 'Date' ] = new Date().toUTCString( );

	result.writeHead( 200, headers );
	result.end( reply.jsonfy( ) );
};
