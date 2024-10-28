# unix-socket-chat

Experiment with using a unix socket and Deno.

## Usage

The server:

```sh
./src/cli.ts
```

Alternatively:

```sh
deno run --reload --allow-write=./sock --allow-read=./sock --allow-run=lsof https://raw.githubusercontent.com/hugojosefson/unix-socket-chat/refs/heads/main/src/cli.ts
```

The clients:

```sh
nc -U ./sock
```

## License

MIT
