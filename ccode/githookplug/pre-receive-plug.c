#include <sys/types.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <limits.h>
#include <stdlib.h>
#include <unistd.h>
#include <stdio.h>

#define SOCKETPATH "/var/run/gitengine/pre-receive"

int main( int argc, char** argv )
{
	char cwd[ PATH_MAX ];

	if( !getcwd( cwd, sizeof( cwd ) ) )
	{
		perror( "getcwd( )" );
		exit( -1 );
	}

	FILE *fs;
	{
		struct sockaddr_un server = { 0, };
		int fds = socket( AF_UNIX, SOCK_STREAM, 0 );
		if( fds < 0 )
		{
			perror( "creating socket" );
			exit( -1 );
		}

		server.sun_family = AF_UNIX;
		strcpy( server.sun_path, SOCKETPATH );
		if( connect( fds, (struct sockaddr *) &server, sizeof(struct sockaddr_un) ) < 0 )
		{
			perror( "connecting socket" );
			close( fds );
			exit( -1 );
		}

		fs = fdopen( fds, "w+" );
		if( fs == NULL )
		{
			perror( "opening socket" );
			close( fds );
			exit( -1 );
		}
	}

	if( fputs( cwd, fs ) == EOF ) { perror( "writing socket" ); fclose( fs ); exit( -1 ); }
	if( fputc( 0, fs ) == EOF )   { perror( "writing socket" ); fclose( fs ); exit( -1 ); }

	// git environment forward, this list must be identical to
	// parsing in src/Sock/PreReceive.js!
	char const * const gitvars[] =
	{
		"GITENGINE_USER",
		"GIT_ALTERNATE_OBJECT_DIRECTORIES",
		"GIT_EXEC_PATH",
		"GIT_MERGE_AUTOEDIT",
		"GIT_OBJECT_DIRECTORY",
		"GIT_PUSH_OPTION_COUNT",
		"GIT_QUARANTINE_PATH",
		NULL,
	};

	for( char const * const * gv = gitvars; *gv; gv++ )
	{
		char const * v = getenv( *gv );
		if( v && fputs( v, fs ) == EOF ) { perror( "writing socket" ); fclose( fs ); exit( -1 ); }
		if( fputc( 0, fs ) == EOF ) { perror( "writing socket" ); fclose( fs ); exit( -1 ); }
	}

	// forwards stdin to gitengine
	char buffer[ 65536 ] = { 0, };
	for(;;)
	{
		size_t r = fread( buffer, 1, sizeof( buffer ), stdin );
		if( r > 0 ) fwrite( buffer, 1, r, fs );
		if( ferror( fs ) )
		{
			perror( "writing socket" ); fclose( fs ); exit( -1 );
		}
		if( feof( fs ) ) break;
		if( r == 0 ) break;
	}
	if( fputc( 0, fs ) == EOF ) { perror( "writing socket" ); fclose( fs ); exit( -1 ); }

	fflush( fs );

	// here gitengine decides on the receive
	// first character of the reply is the exit code

	int exitcode = fgetc( fs );
	if( exitcode == -1 )
	{
		perror( "reading socket" ); fclose( fs ); exit( -1 );
	}

	// and the rest is a message forwarded to stdout
	for(;;)
	{
		size_t r = fread( buffer, 1, sizeof( buffer ), fs );
		if( r > 0 ) fwrite( buffer, 1, r, stdout );
		if( ferror( fs ) )
		{
			perror( "reading socket" ); fclose( fs ); exit( -1 );
		}
		if( feof( fs ) ) break;
		if( r == 0 ) break;
	}

	return exitcode - '0';
}
