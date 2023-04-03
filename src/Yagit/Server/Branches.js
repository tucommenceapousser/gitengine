/*
| Handles branches requests.
|
| Provides info about branches in a repository and their head commit.
*/
'use strict';

def.abstract = true;

import nodegit from 'nodegit';

import { Self as Access            } from '{Yagit/Server/Access}';
import { Self as Https             } from '{Https/Self}';
import { Self as ReplyBranches     } from '{Yagit/Reply/Branches}';
import { Self as RepositoryManager } from '{Repository/Manager}';
import { Self as StringGroup } from '{ti2c:string/group}';

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
