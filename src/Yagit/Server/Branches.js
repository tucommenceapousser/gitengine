/*
| Handles branches requests.
|
| Provides info about branches in a repository and their head commit.
*/
'use strict';

def.abstract = true;

const nodegit = require( 'nodegit' );

const Access = ti2c.require( 'Yagit/Server/Access' );
const Https = ti2c.require( 'Https/Self' );
const ReplyBranches = ti2c.require( 'Yagit/Reply/Branches' );
const RepositoryManager = ti2c.require( 'Repository/Manager' );
const StringGroup = ti2c.require( 'ti2c:string/group' );

/*
| Handles a file request.
*/
def.static.handle =
	async function( request, result, path )
{
	const parts = path.parts;

	const plen = parts.length;
	if( plen !== 2 )
	{
		return Https.error( result, 404, 'invalid request length' );
	}

/**/if( CHECK && parts.get( 0 ) !== 'branches' ) throw new Error( );

	const repoName = parts.get( 1 );

	if( !Access.test( request, result, repoName ) ) return;

	const repo = RepositoryManager.get( repoName );
	// repo must exist otherwise access would have denied

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
