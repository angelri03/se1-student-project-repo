# se1-student-project-repo

### `backend` setup instructions
- Install [conda](https://www.anaconda.com/docs/getting-started/miniconda/install)
- Create and activate a conda environment
```sh
conda create -n se1 python=3.11 pip
conda activate se1
```
- Ensure you are in the backend folder
```sh
cd backend
```
- Install dependencies
```sh
pip install -r requirements.txt
```
- Run the server
```sh
python main.py
```
- Congratulations! It's now available at `http://localhost:5000`!

### `backend` command-line testing instructions
This section is to be removed before we submit, currently just useful such that all can confirm this works on their device as intended.

- Create a user
```sh
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username": "john_doe", "password": "secret123", "email": "john@example.com"}'
```

- Get all users
```sh
curl http://localhost:5000/api/users
```

- Update a user
```sh
curl -X PUT http://localhost:5000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"email": "newemail@example.com"}'
```

- Delete a user
```sh
curl -X DELETE http://localhost:5000/api/users/1
```

