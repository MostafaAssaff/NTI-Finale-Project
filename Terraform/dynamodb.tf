resource "aws_dynamodb_table" "todos_table" {
  name           = "todos"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name        = "TodosTable"
    Environment = var.environment
  }
}