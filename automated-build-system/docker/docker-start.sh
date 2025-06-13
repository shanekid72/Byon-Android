#!/bin/bash

# LuluPay Docker Build Environment Startup Script
# Manages the complete containerized build infrastructure

set -euo pipefail

# Script configuration
SCRIPT_NAME="LuluPay Docker Environment Manager"
SCRIPT_VERSION="1.0.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE="docker.env"
PROJECT_NAME="lulupay-build"

# Function to show help
show_help() {
    cat << EOF
${SCRIPT_NAME} v${SCRIPT_VERSION}

USAGE:
    $0 [COMMAND] [OPTIONS]

COMMANDS:
    start           Start the build environment
    stop            Stop the build environment
    restart         Restart the build environment
    status          Show environment status
    logs            Show container logs
    build           Build Docker images
    clean           Clean up containers and volumes
    test            Test the environment
    help            Show this help message

OPTIONS:
    --env-file FILE     Environment file (default: docker.env)
    --project NAME      Project name (default: lulupay-build)
    --verbose           Enable verbose output
    --force             Force operation without confirmation
    --no-build          Skip building images

EXAMPLES:
    $0 start                    # Start the environment
    $0 status                   # Check status
    $0 logs android-builder     # Show builder logs
    $0 restart --force          # Force restart
    $0 clean --force            # Clean everything

EOF
}

# Function to parse arguments
parse_args() {
    COMMAND=""
    VERBOSE=false
    FORCE=false
    NO_BUILD=false
    SERVICE=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            start|stop|restart|status|logs|build|clean|test|help)
                COMMAND="$1"
                shift
                ;;
            --env-file)
                ENV_FILE="$2"
                shift 2
                ;;
            --project)
                PROJECT_NAME="$2"
                shift 2
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --no-build)
                NO_BUILD=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                if [[ "$COMMAND" == "logs" && -z "$SERVICE" ]]; then
                    SERVICE="$1"
                else
                    log_error "Unknown option: $1"
                    show_help
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # Default command
    if [[ -z "$COMMAND" ]]; then
        COMMAND="start"
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    # Check Docker Compose file
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        log_error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        exit 1
    fi

    # Check environment file
    if [[ ! -f "$ENV_FILE" ]]; then
        log_warning "Environment file not found: $ENV_FILE"
        log_info "Using default environment variables"
    fi

    log_success "Prerequisites check passed"
}

# Function to setup environment
setup_environment() {
    log_step "Setting up environment"

    # Create necessary directories
    local dirs=(
        "../storage/builds"
        "../storage/cache/gradle"
        "../storage/cache/build"
        "../storage/keystores"
        "../storage/logs"
    )

    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log_info "Created directory: $dir"
        fi
    done

    # Set proper permissions
    chmod -R 755 ../storage/ 2>/dev/null || true

    log_success "Environment setup complete"
}

# Function to get Docker Compose command
get_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

# Function to start services
start_services() {
    log_step "Starting LuluPay build environment"

    local compose_cmd=$(get_compose_cmd)
    local compose_args="-f $DOCKER_COMPOSE_FILE --project-name $PROJECT_NAME"

    if [[ -f "$ENV_FILE" ]]; then
        compose_args="$compose_args --env-file $ENV_FILE"
    fi

    # Build images if needed
    if [[ "$NO_BUILD" != "true" ]]; then
        log_info "Building Docker images..."
        $compose_cmd $compose_args build --parallel
    fi

    # Start services
    log_info "Starting services..."
    $compose_cmd $compose_args up -d

    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 10

    # Check service health
    check_service_health

    log_success "Build environment started successfully"
}

# Function to stop services
stop_services() {
    log_step "Stopping LuluPay build environment"

    local compose_cmd=$(get_compose_cmd)
    local compose_args="-f $DOCKER_COMPOSE_FILE --project-name $PROJECT_NAME"

    if [[ -f "$ENV_FILE" ]]; then
        compose_args="$compose_args --env-file $ENV_FILE"
    fi

    if [[ "$FORCE" == "true" ]]; then
        log_info "Force stopping services..."
        $compose_cmd $compose_args down --remove-orphans
    else
        log_info "Gracefully stopping services..."
        $compose_cmd $compose_args stop
    fi

    log_success "Build environment stopped"
}

# Function to restart services
restart_services() {
    log_step "Restarting LuluPay build environment"

    stop_services
    sleep 5
    start_services

    log_success "Build environment restarted"
}

# Function to show status
show_status() {
    log_step "Checking environment status"

    local compose_cmd=$(get_compose_cmd)
    local compose_args="-f $DOCKER_COMPOSE_FILE --project-name $PROJECT_NAME"

    if [[ -f "$ENV_FILE" ]]; then
        compose_args="$compose_args --env-file $ENV_FILE"
    fi

    echo
    $compose_cmd $compose_args ps
    echo

    # Show resource usage
    log_info "Container resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" | head -20

    echo
}

# Function to show logs
show_logs() {
    local compose_cmd=$(get_compose_cmd)
    local compose_args="-f $DOCKER_COMPOSE_FILE --project-name $PROJECT_NAME"

    if [[ -f "$ENV_FILE" ]]; then
        compose_args="$compose_args --env-file $ENV_FILE"
    fi

    if [[ -n "$SERVICE" ]]; then
        log_info "Showing logs for service: $SERVICE"
        $compose_cmd $compose_args logs -f "$SERVICE"
    else
        log_info "Showing logs for all services"
        $compose_cmd $compose_args logs -f
    fi
}

# Function to build images
build_images() {
    log_step "Building Docker images"

    local compose_cmd=$(get_compose_cmd)
    local compose_args="-f $DOCKER_COMPOSE_FILE --project-name $PROJECT_NAME"

    if [[ -f "$ENV_FILE" ]]; then
        compose_args="$compose_args --env-file $ENV_FILE"
    fi

    $compose_cmd $compose_args build --parallel --pull

    log_success "Docker images built successfully"
}

# Function to clean up
clean_environment() {
    log_step "Cleaning up environment"

    if [[ "$FORCE" != "true" ]]; then
        echo
        log_warning "This will remove all containers, volumes, and cached data"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Cleanup cancelled"
            return
        fi
    fi

    local compose_cmd=$(get_compose_cmd)
    local compose_args="-f $DOCKER_COMPOSE_FILE --project-name $PROJECT_NAME"

    if [[ -f "$ENV_FILE" ]]; then
        compose_args="$compose_args --env-file $ENV_FILE"
    fi

    # Stop and remove containers
    $compose_cmd $compose_args down --volumes --remove-orphans

    # Remove images
    docker images | grep "lulupay" | awk '{print $3}' | xargs docker rmi -f 2>/dev/null || true

    # Clean up dangling volumes
    docker volume prune -f

    log_success "Environment cleaned up"
}

# Function to check service health
check_service_health() {
    local services=("android-builder" "redis" "mongodb")
    local max_attempts=30
    local attempt=0

    for service in "${services[@]}"; do
        log_info "Checking health of $service..."
        
        while [[ $attempt -lt $max_attempts ]]; do
            if docker ps --filter "name=${PROJECT_NAME}-$service" --filter "status=running" --quiet | grep -q .; then
                log_success "$service is running"
                break
            fi
            
            ((attempt++))
            if [[ $attempt -eq $max_attempts ]]; then
                log_warning "$service may not be healthy"
                break
            fi
            
            sleep 2
        done
        
        attempt=0
    done
}

# Function to test environment
test_environment() {
    log_step "Testing build environment"

    # Check if containers are running
    check_service_health

    # Test Android builder
    log_info "Testing Android builder..."
    if docker exec "${PROJECT_NAME}-android-builder" gradle --version >/dev/null 2>&1; then
        log_success "Android builder is functional"
    else
        log_error "Android builder test failed"
    fi

    # Test Redis connection
    log_info "Testing Redis connection..."
    if docker exec "${PROJECT_NAME}-redis" redis-cli ping >/dev/null 2>&1; then
        log_success "Redis is functional"
    else
        log_error "Redis test failed"
    fi

    # Test MongoDB connection
    log_info "Testing MongoDB connection..."
    if docker exec "${PROJECT_NAME}-mongodb" mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        log_success "MongoDB is functional"
    else
        log_warning "MongoDB test may have failed"
    fi

    log_success "Environment testing completed"
}

# Main execution
main() {
    # Display banner
    echo
    log "🐳 $SCRIPT_NAME v$SCRIPT_VERSION"
    log "Managing LuluPay containerized build environment"
    echo

    # Parse arguments
    parse_args "$@"

    # Execute command
    case $COMMAND in
        start)
            check_prerequisites
            setup_environment
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            check_prerequisites
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        build)
            check_prerequisites
            build_images
            ;;
        clean)
            clean_environment
            ;;
        test)
            test_environment
            ;;
        help)
            show_help
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac

    log_success "✅ Operation completed successfully"
}

# Execute main function
main "$@" 