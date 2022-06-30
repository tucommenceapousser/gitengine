/*
| Manages the overleaf projects.
*/
'use strict';

def.abstract = true;

const OverleafProject = tim.require( 'Overleaf/Project/Self' );
const OverleafProjectGroup = tim.require( 'Overleaf/Project/Group' );
const Semaphore = tim.require( 'Util/Semaphore' );

/*
| The projects.
*/
let _projects;

/*
| Initalizes the overleaf project manager.
*/
def.static.init =
	function( )
{
	_projects = OverleafProjectGroup.Empty;
};

/*
| Sets a down sync timestamp.
*/
def.static.getDownSyncTimestamp =
	function( id, timestamp )
{
	return _projects.get( id ).downSyncTimestamp;
};

/*
| Releases a project semaphore.
|
| ~name: name of the repository.
| ~flag: semaphore flag.
*/
def.static.releaseSemaphore =
	function( id, flag )
{
	_projects.get( id ).semaphore.release( flag );
};

/*
| Requests an project semaphore.
|
| ~name: name of the repository.
|
| ~return: the semaphore flag.
*/
def.static.requestSemaphore =
	async function( id )
{
	let project = _projects.get( id );
	if( !project )
	{
		project = OverleafProject.create( 'id', id, 'semaphore', Semaphore.create( ) );
		_projects = _projects.set( id, project );
	}
	return await project.semaphore.request( );
};

/*
| Sets a down sync timestamp.
*/
def.static.setDownSyncTimestamp =
	function( id, timestamp )
{
	let project = _projects.get( id );
	project = project.create( 'downSyncTimestamp', timestamp );
	_projects = _projects.set( id, project );
};
