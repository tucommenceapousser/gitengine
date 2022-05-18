/*
| Manages the repositories.
*/
'use strict';

def.abstract = true;

const fs = require( 'fs/promises' );

const CGit = tim.require( 'Http/CGit' );
const Exec = tim.require( 'System/Exec' );
const Repository = tim.require( 'Repository/Self' );
const RepositoryGroup = tim.require( 'Repository/Group' );
const Semaphore = tim.require( 'Util/Semaphore' );

/*
| The receive hook.
*/
let _receiveHook = '/usr/local/bin/post-receive-plug';

/*
| The repositories.
*/
let _repositories;

/*
| Semaphore to writing and branch queries.
*/
let _semaphore;

/*
| If set calls this function on receives.
*/
let _receiveCallback;

/*
| Creates all repositories in cscdata that are not yet on disk.
*/
def.static.createRepositories =
	async function( )
{
	console.log( '* creating git repositories on filesystem' );
    const flag = await _semaphore.request( );

    for( let name of _repositories.keys )
	{
		const repo = _repositories.get( name );
		const path = repo.path;

		let stat;
		try{ stat = await fs.stat( path ); }
		catch( e )
		{
			// rethrows anything but not found.
			if( e.code !== 'ENOENT' ) throw e;
		}

		if( stat )
		{
			const hookPath = path + '/hooks/post-receive';
			if( _receiveCallback )
			{
				// installs post-receive hooks for callback.
				try
				{
					await fs.symlink( _receiveHook, hookPath );
				}
				catch( e )
				{
					if( e.code !== 'EEXIST' ) throw e;
				}
			}
			else
			{
				// if no callback is given removes due to
				// potentially changed configuration
				try
				{
					const link = await fs.readlink( hookPath );
					if( link === _receiveHook )
					{
						await fs.rm( hookPath );
					}
				}
				catch( e )
				{
					if( e.code !== 'ENOENT' ) console.log( e );
				}
			}
		}
		else
		{
			console.log( '** creating new git repository: ' + path );
			await fs.mkdir( path );
			const opts = { cwd: path };
			await Exec.file(
				'/usr/bin/git', [ 'init', '--bare', '.' ], opts
			);
			await Exec.file(
				'/usr/bin/git', [ 'config', 'receive.denyNonFastForwards', 'true' ], opts
			);
			await Exec.file(
				'/usr/bin/git', [ 'config', 'receive.denyDeletes', 'true' ], opts
			);

			if( _receiveCallback )
			{
				await fs.symlink( _receiveHook, path + '/hooks/post-receive' );
				_receiveCallback( 'init:' + name );
			}
		}
	}
	_semaphore.release( flag );
};

/*
| Gets a repository
*/
def.static.get = ( name ) => _repositories.get( name );

/*
| Initalizes the group manager.
*/
def.static.init =
	function( )
{
	_repositories = RepositoryGroup.Empty;
	_semaphore = Semaphore.create( );
};

/*
| Returns the repositories.
*/
def.static.repositories = ( ) => _repositories;

/*
| Reads in branches for a repository (or all)
|
| ~name: name of repository to read branches for
|        if undefined reads in branches for all repositories.
*/
def.static.readBranches =
	async function( name )
{
	const flag = await _semaphore.request( );
	if( name )
	{
		let repo = _repositories.get( name );
		if( !repo ) { _semaphore.release( flag ); return; }
		repo = await repo.readBranches( );
		_repositories = _repositories.set( name, repo );
	}
	else
	{
	    for( let name of _repositories.keys )
	    {
			let repo = _repositories.get( name );
			if( !repo ) continue;
	        repo = await repo.readBranches( );
	        _repositories = _repositories.set( name, repo );
	    }
	}
	_semaphore.release( flag );
};

/*
| Sets the receive callback.
*/
def.static.receiveCallback =
	function( rcb )
{
	_receiveCallback = rcb;
};

/*
| Removes a repository.
|
| Does not delete it from disk.
*/
def.static.remove =
	function( name )
{
	_repositories = _repositories.remove( name );
	CGit.invalidate( true );
};

/*
| Sets a repository.
*/
def.static.set =
	function( repository )
{
/**/if( CHECK && repository.timtype !== Repository ) throw new Error( );
	const prev = _repositories.get( repository.name );

	if( prev && prev.alikeIgnoringBranches( repository ) ) return;

	_repositories = _repositories.set( repository.name, repository );
	CGit.invalidate( true );
};

