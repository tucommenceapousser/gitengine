/*
| Manages the remote coupled repositories.
*/
'use strict';

def.abstract = true;

const RemoteRepository = ti2c.require( 'Coupling/Repository/Self' );
const RemoteRepositoryGroup = ti2c.require( 'Coupling/Repository/Group' );
const Semaphore = ti2c.require( 'Util/Semaphore' );

/*
| The repositories.
*/
let _repositories;

/*
| Initalizes the overleaf project manager.
*/
def.static.init =
	function( )
{
	_repositories = RemoteRepositoryGroup.Empty;
};

/*
| Sets a down sync timestamp.
*/
def.static.getDownSyncTimestamp =
	function( url, timestamp )
{
	return _repositories.get( url ).downSyncTimestamp;
};

/*
| Releases a project semaphore.
|
| ~name: name of the repository.
| ~flag: semaphore flag.
*/
def.static.releaseSemaphore =
	function( url, flag )
{
	_repositories.get( url ).semaphore.release( flag );
};

/*
| Requests an project semaphore.
|
| ~name: name of the repository.
|
| ~return: the semaphore flag.
*/
def.static.requestSemaphore =
	async function( url )
{
	let repository = _repositories.get( url );
	if( !repository )
	{
		repository = RemoteRepository.create( 'url', url, 'semaphore', Semaphore.create( ) );
		_repositories = _repositories.set( url, repository );
	}
	return await repository.semaphore.request( );
};

/*
| Sets a down sync timestamp.
*/
def.static.setDownSyncTimestamp =
	function( url, timestamp )
{
	let repository = _repositories.get( url );
	repository = repository.create( 'downSyncTimestamp', timestamp );
	_repositories = _repositories.set( url, repository );
};
