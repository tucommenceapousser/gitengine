/*
| Manages the repositories.
*/
'use strict';

def.abstract = true;

import fs from 'fs/promises';

import { Self as CGit            } from '{Https/CGit}';
import { Self as Exec            } from '{System/Exec}';
import { Self as Log             } from '{Log/Self}';
import { Self as Repository      } from '{Repository/Self}';
import { Self as RepositoryGroup } from '{Repository/Group}';
import { Self as Semaphore       } from '{Util/Semaphore}';
import { Self as StringGroup     } from '{ti2c:string/group}';
import { Self as SockPostReceive } from '{Sock/PostReceive}';
import { Self as SockPreReceive  } from '{Sock/PreReceive}';

/*
| The post receive plug.
*/
let _postReceivePlug = '/usr/local/bin/post-receive-plug';

/*
| The repositories.
*/
let _repositories;

/*
| The repositories by path.
*/
let _paths;

/*
| Semaphore to writing and branch queries.
*/
let _semaphore;

/*
| If set calls this function on pre-receive.
*/
let _preReceiveCallback;

/*
| If set calls this function on post-receive.
*/
let _postReceiveCallback;

/*
| Releases a coupling semaphore.
|
| ~name: name of the repository.
| ~flag: the semaphore flag.
*/
def.static.couplingReleaseSemaphore =
	async function( name, flag )
{
	_repositories.get( name ).couplingSemaphore.release( flag );
};

/*
| Requests a coupling semaphore.
|
| ~name: name of the repository.
|
| ~return: the semaphore flag.
*/
def.static.couplingRequestSemaphore =
	async function( name )
{
	let repository = _repositories.get( name );
	if( !repository.couplingSemaphore )
	{
		repository = repository.create( 'couplingSemaphore', Semaphore.create( ) );
		_repositories = _repositories.set( name, repository );
	}
	return await repository.couplingSemaphore.request( );
};

/*
| Creates all repositories in cscdata that are not yet on disk.
|
| ~extraCreator: if defined calls this function for every
|                new repository created.
|                extraCreator( name, path );
*/
def.static.createRepositories =
	async function( extraCreator )
{
	Log.log( 'git', '*', 'creating git repositories on filesystem' );
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

		const postReceiveHookPath = path + '/hooks/post-receive';
		if( stat )
		{
			if( _postReceiveCallback )
			{
				// installs post-receive hooks for callback.
				try
				{
					await fs.symlink( _postReceivePlug, postReceiveHookPath );
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
					const link = await fs.readlink( postReceiveHookPath );
					if( link === _postReceivePlug ) await fs.rm( postReceiveHookPath );
				}
				catch( e )
				{
					if( e.code !== 'ENOENT' ) console.log( e );
				}
			}
		}
		else
		{
			Log.log( 'git', '*', 'creating new git repository: ' + path );
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

			if( _postReceiveCallback )
			{
				await fs.symlink( _postReceivePlug, postReceiveHookPath );
			}

			if( extraCreator ) extraCreator( name, path );
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
	_paths = StringGroup.create( );
	_semaphore = Semaphore.create( );
};

/*
| Called by SockPostReceive on a git-post-receive event.
*/
def.static.onPostReceive =
	function( path )
{
	if( !_postReceiveCallback )
	{
		Log.log( 'git', '*', 'got a git-pre-receive event but have no preReceiveCallback' );
		return;
	}

	let name = _paths.get( path );
	if( !name )
	{
		Log.log( 'git', '*', 'got a git-pre-receive event from unknown path :' + path );
		return;
	}

	_postReceiveCallback( name );
};

/*
| Called by SockPreReceive on a git-pre-receive event.
*/
def.static.onPreReceive =
	async function( path, environ, stdin )
{
	if( !_preReceiveCallback )
	{
		Log.log( 'git', '*', 'got a git-pre-receive event but have no preReceiveCallback' );
		return '0';
	}

	const name = _paths.get( path );
	if( !name )
	{
		Log.log( 'git', '*', 'got a git-re-receive event from unknown path :' + path );
		return '0';
	}

	return await _preReceiveCallback( name, path, environ, stdin );
};

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
| Sets the post-receive callback.
*/
def.static.postReceiveCallback =
	function( rcb )
{
	_postReceiveCallback = rcb;
};

/*
| Sets the pre-receive callback.
*/
def.static.preReceiveCallback =
	function( rcb )
{
	_preReceiveCallback = rcb;
};

/*
| Removes a repository.
|
| Does not delete it from disk.
*/
def.static.remove =
	function( name )
{
	const repository = _repositories.get( name );
	_repositories = _repositories.remove( name );
	_paths = _paths.remove( repository.path );
	CGit.invalidate( true );
};

/*
| Returns the repositories.
*/
def.static.repositories = ( ) => _repositories;

/*
| Sets a repository.
*/
def.static.set =
	function( repository )
{
/**/if( CHECK && repository.ti2ctype !== Repository ) throw new Error( );
	const prev = _repositories.get( repository.name );

	if( prev && prev.alikeIgnoringBranches( repository ) ) return;

	if( !prev && _paths.get( repository.path ) )
	{
		throw new Error(
			'path "' + repository.path + '" already used by '
			+ _paths.get( repository.path )
		);
	}

	_repositories = _repositories.set( repository.name, repository );
	_paths = _paths.set( repository.path, repository.name );
	CGit.invalidate( true );
};

/*
| Starts the repository manager.
*/
def.static.start =
	async function( )
{
	await Self.createRepositories( );
	if( _postReceiveCallback ) SockPostReceive.open( );
	if( _preReceiveCallback ) SockPreReceive.open( );
};
