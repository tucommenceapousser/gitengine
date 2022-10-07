/*
| The data about a repository (filesystem, not cscdata)
*/
'use strict';

def.attributes =
{
	// branches in the repository
	branches: { type: [ 'undefined', 'Branch/Group' ], },

	// branch to couple ( empty, '' or undefined is "master").
	couplingBranch: { type: [ 'undefined', 'string' ], },

	// the dir to couple ( empty, '' or undefined is whole repository).
	couplingDir: { type: [ 'undefined', 'string' ], },

	// the url to couple to.
	couplingUrl: { type: [ 'undefined', 'string' ], },

	// coupling syncronization
	couplingSemaphore: { type: [ 'undefined', 'Util/Semaphore' ], },

	// the repository description
	description: { type: [ 'undefined', 'string' ], },

	// groups and their permissions ( keys username, value, 'r' or 'rw' )
	groups: { type: 'tim:string/group' },

	// repository name
	name: { type: 'string' },

	// the branch to sync ( empty, '' or undefined is "master")
	overleafBranch: { type: [ 'undefined', 'string' ], },

	// the dir to sync ( empty, '' or undefined is whole repository)
	overleafDir: { type: [ 'undefined', 'string' ], },

	// the overleaf project id to sync with (community edition, web api)
	overleafCeProjectId: { type: [ 'undefined', 'string' ], },

	// overleaf syncronization is semaphored
	overleafSemaphore: { type: [ 'undefined', 'Util/Semaphore' ], },

	// path on disk
	path: { type: 'string' },

	// users and their permissions ( keys username, value, 'r' or 'rw' )
	users: { type: 'tim:string/group' },
};

def.alike =
{
	alikeIgnoringBranches:
	{
		ignores: { 'branches': true },
	}
};

const nodegit = require( 'nodegit' );

const Branch = tim.require( 'Branch/Self' );
const BranchGroup = tim.require( 'Branch/Group' );
//const Log = tim.require( 'Log/Self' );
const User = tim.require( 'User/Self' );

/*
| Sees what permissions the 'user' has on this file.
|
| ~user: user data object.
|
| ~return: 'rw', 'r' or false.
*/
def.proto.getPermissions =
	function( user )
{
/**/if( CHECK )
/**/{
/**/	if( arguments.length !== 1 ) throw new Error( );
/**/	if( user.timtype !== User ) throw new Error( );
/**/}

	let perms = this.users.get( user.username ) || false;

	const groups = this.groups;
	for( let gname of user.groups )
	{
		const gperms = groups.get( gname );
		if( !gperms ) continue;

		if( !perms || gperms.length > perms.length ) perms = gperms;
	}

	return perms;
};

/*
| Reads the branches of this repository from disk.
|
| ~return repo with branches (re)created.
*/
def.proto.readBranches =
	async function( )
{
	const ngRepo = await nodegit.Repository.open( this.path );
	const refNames = await ngRepo.getReferenceNames( nodegit.Reference.TYPE.ALL );
	const bTable = { };
	for( let refName of refNames )
	{
		if( !refName.startsWith( 'refs/heads/' ) ) continue;
		refName = refName.substr( 11 ); // cut 'refs/heads/'
		const commit = await ngRepo.getBranchCommit( refName );
		bTable[ refName ] =
			Branch.create(
				'name', refName,
				'lastCommitHash', commit.sha( )
			);
	}
	return this.create( 'branches', BranchGroup.Table( bTable ) );
};
