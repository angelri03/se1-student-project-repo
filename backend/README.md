# Backend API Server

Flask-based REST API server for the student project repository platform.

## Quick Start

### Prerequisites
- Python 3.11+
- [Conda](https://www.anaconda.com/docs/getting-started/miniconda/install) (recommended)

### Installation

1. **Create and activate conda environment**
   ```sh
   conda create -n se1 python=3.11 pip
   conda activate se1
   ```

2. **Navigate to backend directory**
   ```sh
   cd backend
   ```

3. **Install dependencies**
   ```sh
   pip install -r requirements.txt
   ```

4. **Initialize the database**
   ```sh
   python seed_db.py
   python migrate_db.py
   ```

5. **Run the server**
   ```sh
   python main.py
   ```

The API will be available at `http://localhost:5000`

## Testing

Run unit tests with pytest:

```sh
cd backend
python -m pytest tests/ -v --tb=short
```
