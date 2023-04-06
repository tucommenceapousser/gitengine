all: post-receive-plug pre-receive-plug

clean:
	rm -f post-receive-plug
	rm -f pre-receive-plug

pre-receive-plug: pre-receive-plug.c
	gcc -Wall -o $@ $<

post-receive-plug: post-receive-plug.c
	gcc -Wall -o $@ $<

install: post-receive-plug pre-receive-plug
	cp post-receive-plug /usr/local/bin/
	cp pre-receive-plug /usr/local/bin/
