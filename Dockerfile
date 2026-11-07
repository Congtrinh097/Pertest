# Base on the official Grafana k6 image
FROM grafana/k6:latest

# Set working directory inside container
WORKDIR /app

# Copy framework files
COPY k6-performance /app/k6-performance

# Expose reports volume
VOLUME ["/app/k6-performance/reports"]

# Default entrypoint runs smoke test
ENTRYPOINT ["k6", "run"]
CMD ["k6-performance/tests/smoke/crud.smoke.js"]
