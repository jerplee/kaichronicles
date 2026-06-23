# Docker

Running Kai Chronicles inside a Docker container configures and runs a local website for playing the game. If you intend to develop the game and are not familiar with Docker, then this method is not recommended.

## Quick Start (Docker Compose)

The easiest way to run the game:

```bash
docker compose up
```

Then open http://localhost:8094.

To stop: `Ctrl+C` or `docker compose down`.

## Manual Build & Run

 * Download and install [Docker](https://docs.docker.com/install/) and make sure it is in your PATH environment variable
 * Using a terminal (Linux, macOS) or PowerShell (Windows) navigate to the project's directory
 * Build the image:
     ```bash
     docker build -t kai:1.22 .
     ```
     * The build command only needs to be run once.
     * It takes a while.
 * Run the container:
     ```bash
     docker run -p 8094:8094 kai:1.22
     ```
     * To run in the background, add `-d`: `docker run -d -p 8094:8094 kai:1.22`
     * If port 8094 is already in use, change the *first* number to map a different host port, e.g. `docker run -p 5000:8094 kai:1.22`
 * Open http://localhost:8094

## Updating to a Newer Version

**Docker Compose:**
```bash
docker compose down
docker compose up --build
```

**Manual Docker:**
```bash
docker stop kaichronicles
docker build -t kai:1.22 .
docker run -p 8094:8094 kai:1.22
```