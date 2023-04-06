#include <sys/types.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <limits.h>
#include <stdlib.h>
#include <unistd.h>
#include <stdio.h>

#define SOCKETPATH "/var/run/gitengine/post-receive"

int main( int argc, char** argv )
{
	char buffer[ 65536 ] = { 0, };
	char cwd[ PATH_MAX ];

	if( !getcwd( cwd, sizeof( cwd ) ) )
	{
		perror( "getcwd( )" );
		exit( 0 );
	}

	snprintf( buffer, sizeof( buffer ), "%lu %s", strlen( cwd ), cwd );
	struct sockaddr_un server = { 0, };
	int sock = socket( AF_UNIX, SOCK_STREAM, 0 );
	if( sock < 0 )
	{
		perror( "opening stream socket" );
		exit( 0 );
	}

	server.sun_family = AF_UNIX;
	strcpy( server.sun_path, SOCKETPATH );
	if( connect( sock, (struct sockaddr *) &server, sizeof(struct sockaddr_un) ) < 0 )
	{
		perror( "connecting stream socket" );
		close( sock );
		exit( 0 );
	}

	size_t total = 0;
	size_t goal = strlen( buffer );
	size_t result;
	while( total < goal )
	{
		result = write( sock, buffer + total, goal - total );
		if( result == -1 )
		{
			close( sock );
			perror( "writing stream socket" );
			exit( 0 );
		}
		total += result;
	}

	buffer[ 0 ] = 0;
	read( sock, buffer, 1 );

	buffer[ 1 ] = 0;
	return buffer[ 0 ] - '0';
}
