all: post-receive-plug

clean:
	rm -f post-receive-plug

post-receive-plug: post-receive-plug.c
	gcc -Wall -o $@ $<

install: post-receive-plug
	cp post-receive-plug /usr/local/bin/
