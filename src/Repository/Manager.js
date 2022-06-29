/*
| Manages the repositories.
*/
'use strict';

def.abstract = true;

const fs = require( 'fs/promises' );

const CGit = tim.require( 'Http/CGit' );
const Exec = tim.require( 'System/Exec' );
const Log = tim.require( 'Log/Self' );
const OverleafProjectManager = tim.require( 'Overleaf/Project/Manager' );
const Repository = tim.require( 'Repository/Self' );
const RepositoryGroup = tim.require( 'Repository/Group' );
const Semaphore = tim.require( 'Util/Semaphore' );
const StringGroup = tim.require( 'tim:string/group' );
const SockHook = tim.require( 'Sock/Hook' );

/*
| The receive hook.
*/
let _receiveHook = '/usr/local/bin/post-receive-plug';

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
| If set calls this function on receives.
*/
let _receiveCallback;

/*
| Creates all repositories in cscdata that are not yet on disk.
*/
def.static.createRepositories =
	async function( )
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
	_paths = StringGroup.create( );
	_semaphore = Semaphore.create( );
};

/*
| Called by HookSock on a git-receive event.
*/
def.static.onPostReceive =
	function( path )
{
	if( !_receiveCallback )
	{
		Log.log( 'git', '*', 'got a git-receive event but have no receiveCallback' );
		return;
	}
	let name = _paths.get( path );
	if( !name )
	{
		Log.log( 'git', '*', 'got a git-receive event from unknown path :' + path );
		return;
	}
	_receiveCallback( name );
};

/*
| Down-syncs an overleaf project into a repository.
*/
def.static.overleafDownSync =
	async function( name, count )
{
/**/if( CHECK )
/**/{
/**/    if( arguments.length !== 2 ) throw new Error( );
/**/    if( typeof( name ) !== 'string' ) throw new Error( );
/**/}

	const opid = _repositories.get( name ).overleafProjectId;
	console.log( 'XXX', opid );
	if( !opid || opid === '' ) return;

	const olFlag = await Self._overleafRequestSemaphore( name );
	const idFlag = await OverleafProjectManager.requestSemaphore( opid );

	Log.log( 'overleaf', count, 'down syncing ' + opid + ' to ' + name );

	console.log( 'TODO', 'XXX' );

	OverleafProjectManager.releaseSemaphore( opid, idFlag );
	_repositories.get( name ).overleafSemaphore.release( olFlag );
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
/**/if( CHECK && repository.timtype !== Repository ) throw new Error( );
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
	if( _receiveCallback ) SockHook.open( );
};

/*
| Releases an overleaf semaphore.
|
| ~name: name of the repository.
| ~flag: semaphore flag.
|
| ~return: the semaphore flag.
*/
/*
def.static._overleafReleaseSemaphore =
	function( name, flag )
{
	_repositories.get( name ).release( flag );
};
*/

/*
| Requests an overleaf semaphore.
|
| ~name: name of the repository.
|
| ~return: the semaphore flag.
*/
def.static._overleafRequestSemaphore =
	async function( name )
{
	let repository = _repositories.get( name );
	if( !repository.overleafSemaphore )
	{
		repository = repository.create( 'overleafSemaphore', Semaphore.create( ) );
		_repositories = _repositories.set( name, repository );
	}
	return await repository.overleafSemaphore.request( );
};
