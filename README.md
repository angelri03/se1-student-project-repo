# se1-student-project-repo

### structure
- frontend: react-based user interface
- backend: database and API server (python)
- report: deliverable 1 documentation

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

### how to run the web application
- Install packages
```sh
cd frontend
npm install
```

- Run development server
```sh
npm run dev
```

- It's now available at `http://localhost:3000`