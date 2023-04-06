#include <sys/types.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <limits.h>
#include <stdlib.h>
#include <unistd.h>
#include <stdio.h>

#define SOCKETPATH "/var/run/datanode/pre-receive"

int main( int argc, char** argv )
{
	char cwd[ PATH_MAX ];

	if( !getcwd( cwd, sizeof( cwd ) ) )
	{
		perror( "getcwd( )" );
		exit( -1 );
	}

	struct sockaddr_un server = { 0, };
	int sock = socket( AF_UNIX, SOCK_STREAM, 0 );
	if( sock < 0 )
	{
		perror( "opening stream socket" );
		exit( -1 );
	}

	server.sun_family = AF_UNIX;
	strcpy( server.sun_path, SOCKETPATH );
	if( connect( sock, (struct sockaddr *) &server, sizeof(struct sockaddr_un) ) < 0 )
	{
		perror( "connecting stream socket" );
		close( sock );
		exit( -1 );
	}

	{
		size_t total = 0;
		size_t goal = strlen( cwd ) + 1;
		while( total < goal )
		{
			size_t w = write( sock, cwd + total, goal - total );
			if( w == -1 )
			{
				close( sock );
				perror( "writing stream socket" );
				exit( -1 );
			}
			total += w;
		}
	}

	char buffer[ 65536 ] = { 0, };
	for(;;)
	{
		size_t total = 0;
		size_t r = read( 0, buffer, sizeof( buffer ) );
		if( r == -1 )
		{
			close( sock );
			perror( "reading stdin" );
			exit( -1 );
		}
		if( r == 0 ) break;
		while( total < r )
		{
			size_t w = write( sock, buffer + total, r - total );
			if( w == -1 )
			{
				close( sock );
				perror( "writing stream socket" );
				exit( -1 );
			}
			total += w;
		}
	}

	for(;;)
	{
		char zero = 0;
		size_t w = write( sock, &zero, 1 );
		if( w == -1 )
		{
			close( sock );
			perror( "writing stream socket" );
			exit( -1 );
		}
		if( w == 1 ) break;
	}

	for(;;)
	{
		buffer[ 0 ] = 0;
		size_t r = read( sock, buffer, 1 );
		if( r == -1 )
		{
			close( sock );
			perror( "reading stream socket" );
			exit( -1 );
		}
		if( r == 0 ) continue;
	}
	return buffer[ 0 ] - '0';
}
