module.exports = {
  apps: [{
    name: "vc-organic-billing-api",
    script: "server.js",
    cwd: "/opt/vc-organic",
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 8181
    }
  }]
}
