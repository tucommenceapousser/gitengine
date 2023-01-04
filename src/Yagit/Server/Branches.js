/*
| Handles branches requests.
|
| Provides info about branches in a repository and their head commit.
*/
'use strict';

def.abstract = true;

const nodegit = require( 'nodegit' );

const Http = tim.require( 'Yagit/Server/Http' );
const ReplyBranches = tim.require( 'Yagit/Reply/Branches' );
const RepositoryManager = tim.require( 'Repository/Manager' );
const StringGroup = tim.require( 'tim:string/group' );

/*
| Handles a file request.
*/
def.static.handle =
	async function( request, result, path )
{
	// XXX AUTHENTICATION!!

	const parts = path.parts;

	const plen = parts.length;
	if( plen !== 2 )
	{
		return Http.webError( result, 404, 'invalid request length' );
	}

/**/if( CHECK && parts.get( 0 ) !== 'branches' ) throw new Error( );

	const repoName = parts.get( 1 );
	const repo = RepositoryManager.get( repoName );

	if( !repo )
	{
		return Http.webError( result, 404, 'repository unknown' );
	}

	// FIXME use caching of the repository
	const ngRepo = await nodegit.Repository.open( repo.path );
	const ngRefNames = await ngRepo.getReferenceNames( nodegit.Reference.TYPE.ALL );

	const group = { };
	for( let refName of ngRefNames )
	{
		if( !refName.startsWith( 'refs/heads/' ) ) continue;
		const name = refName.substr( 11 );
		const ngCommitHead = await ngRepo.getBranchCommit( refName );
		group[ name ] = ngCommitHead.sha( );
	}

	const reply = ReplyBranches.create( 'branches', StringGroup.Table( group ) );
	result.writeHead( 200, { } );
	result.end( reply.jsonfy( ) );
};
