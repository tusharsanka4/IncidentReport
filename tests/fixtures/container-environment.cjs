// Prints only the synthetic environment supplied by the entrypoint unit test.
console.log(JSON.stringify({ databaseUrl: process.env.DATABASE_URL, args: process.argv.slice(2) }));
