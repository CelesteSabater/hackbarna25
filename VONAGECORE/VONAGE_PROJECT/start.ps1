# start.ps1 - create venv, install deps and pin openai, install tf-keras, run app
py -3 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install "openai==0.28.0"
pip install tf-keras
python app.py
