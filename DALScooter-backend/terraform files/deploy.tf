# VPC and Subnets
resource "aws_vpc" "dalscooter_vpc" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public_subnet_1" {
  vpc_id            = aws_vpc.dalscooter_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id            = aws_vpc.dalscooter_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"
  map_public_ip_on_launch = true
}

# Internet Gateway for public subnets
resource "aws_internet_gateway" "dalscooter_igw" {
  vpc_id = aws_vpc.dalscooter_vpc.id
}

# Route Table for public subnets
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.dalscooter_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.dalscooter_igw.id
  }
}

resource "aws_route_table_association" "public_rt_assoc_1" {
  subnet_id      = aws_subnet.public_subnet_1.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "public_rt_assoc_2" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = aws_route_table.public_rt.id
}

# ECR Repository
resource "aws_ecr_repository" "dalscooter_frontend" {
  name = "dalscooter-frontend"
}

# Task Definition
resource "aws_ecs_task_definition" "dalscooter_task" {
  family                   = "dalscooter-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  container_definitions = jsonencode([{
    name  = "dalscooter-container"
    image = "${aws_ecr_repository.dalscooter_frontend.repository_url}:latest"
    portMappings = [{
      containerPort = 80
      hostPort      = 80
    }]
  }])

  execution_role_arn = "arn:aws:iam::101784748999:role/LabRole"  # Replace with your actual LabRole ARN
}

# ECS Cluster
resource "aws_ecs_cluster" "dalscooter_cluster" {
  name = "dalscooter-cluster"
}

# Service
resource "aws_ecs_service" "dalscooter_service" {
  name            = "dalscooter-service"
  cluster         = aws_ecs_cluster.dalscooter_cluster.id
  task_definition = aws_ecs_task_definition.dalscooter_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]
    security_groups = [aws_security_group.task_sg.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.dalscooter_tg.arn
    container_name   = "dalscooter-container"
    container_port   = 80
  }
}

# Load Balancer
resource "aws_lb" "dalscooter_alb" {
  name               = "dalscooter-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]
}

# Target Group with ip target type
resource "aws_lb_target_group" "dalscooter_tg" {
  name     = "dalscooter-target-group"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.dalscooter_vpc.id
  target_type = "ip"  # Explicitly set to ip for Fargate
  health_check {
    path = "/"
  }
}

resource "aws_lb_listener" "dalscooter_listener" {
  load_balancer_arn = aws_lb.dalscooter_alb.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.dalscooter_tg.arn
  }
}

# Security Groups
resource "aws_security_group" "alb_sg" {
  name        = "dalscooter-alb-sg"
  vpc_id      = aws_vpc.dalscooter_vpc.id
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "task_sg" {
  name        = "dalscooter-task-sg"
  vpc_id      = aws_vpc.dalscooter_vpc.id
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}