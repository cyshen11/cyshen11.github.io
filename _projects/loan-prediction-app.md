---
layout: page
title: Loan Prediction App
description: Building a simple loan prediction web app
img: assets/img/loan-prediction-app/app_screenshot.png
importance: 1
category: machine-learning
related_publications: false
---

I designed this project with the purposes of using AWS RDS to host the data, AutoGluon for building Machine Learning model and Flask for the app. The use case for this project is to predict whether loan will be paid off.

{% include figure.liquid loading="eager" path="assets/img/loan-prediction-app/app_screenshot.png" class="img-fluid rounded z-depth-1" alt="Application Screenshot" %}

&nbsp;

### [App](https://loan-prediction-app.vincentcys.com//){:target="\_blank"}

### [GitHub](https://github.com/cyshen11/loan-prediction-app-aws){:target="\_blank"}

&nbsp;

## Tech Stack

- Frontend: Flask
- Database: AWS RDS (MariaDB)
- File Storage: AWS S3
- Machine Learning: AutoGluon
- Deployment: Render

Flask was chosen for frontend as it was a popular app building framework for Python. RDS was chosen for the database as it is also a popular platform to deploy database. MariaDB variant was chosen due to my own familiarity. AutoGluon was chosen as the AutoML framework due to its popularity. Render was chosen as the deployment platform due to its low cost, and it includes recent Python libraries.

&nbsp;
&nbsp;

## Architecture

{% include figure.liquid loading="eager" path="assets/img/loan-prediction-app/architecture.png" class="img-fluid rounded z-depth-1" alt="Architecture" %}

&nbsp;
&nbsp;

## Step 1: Searching for Open Source Data

I started by searching available data for this project. I found the PKDD'99 Financial dataset from [CTU Relational Dataset Repository](https://relational.fel.cvut.cz/dataset/Financial){:target="\_blank"}. This dataset consists of 606 successful and 76 not successful loans along with their information and transactions. There are 8 tables in this dataset. For this project, this dataset was filtered to only finished loans.

{% include figure.liquid loading="eager" path="assets/img/loan-prediction-app/dataset_schema.svg" class="img-fluid rounded z-depth-1" alt="Dataset Schema" %}

## Step 2: Download Dataset

I used MySQL Workbench to connect to the CTU Relational database and exported the dataset in SQL dump format.

## Step 3: Setting up RDS Instance

Next, I created a db.t4g.micro instance running MariaDB as this is under AWS free tier and is sufficient for this project. I set up a EC2 instance as a bastion host to connect to the RDS instance because the RDS instance is provisioned in private network. This is best practice as RDS instance should not be reachable over public network for security purpose. I connected to the RDS instance and uploaded the dataset.

## Step 4: EDA

To create the machine learning model, I performed EDA using [Jupyter notebook](https://github.com/cyshen11/loan-prediction-app-aws/blob/main/jupyter-nb/EDA.ipynb){:target="\_blank"} to understand the dataset and what can be used as features. I used my device to connect to the EC2 instance to connect to the RDS instance. This method only works for querying small size of data. This means that only aggregation and dataset preview is feasible for this method. EDA is performed to understand the distribution of the data, for example count of card types.

**Example EDA: Loan Amount by Status**

{% include figure.liquid loading="eager" path="assets/img/loan-prediction-app/loan_amount_by_status.png" class="img-fluid rounded z-depth-1" alt="EDA Loan Amount by Status" %}

## Step 5: Export Data from RDS to S3

To train the model on the dataset, all the dataset was exported from RDS to S3. A database snapshot was created, and the snapshot data was exported to a S3 bucket.

## Step 6: Feature Engineering

Initially, I tried to create the features myself and train the model. However, the result was not satisfactory as it always predicts that the loan will be paid off. Hence, I used the features from this [article](https://medium.com/data-science/loan-default-prediction-an-end-to-end-ml-project-with-real-bank-data-part-1-1405f7aecb9e#ed0c){:target="\_blank"} by Zhou (Joe) Xu.

Below are the features used to create the prediction model

- loan duration
- loan amount
- loan payments
- day between loan date and account creation date
- account frequency
- average order amount
- average transaction amount
- average transaction balance
- number of transactions
- card type
- average salary in the district
- gender
- age

Loan table was joined with Account, Displacement, Card, Client, District, Transaction, and Orders tables to create the features.

{% include figure.liquid loading="eager" path="assets/img/loan-prediction-app/dataset_with_features.png" class="img-fluid rounded z-depth-1" alt="Dataset with Features" %}

## Step 7: Model Training

The dataset with features was split into 70% (202 rows) for training and 30% (87 rows) for testing. TabularPredictor class from AutoGluon library was used to train the model with below hyperparameters.

```python
hyperparameters = {
	'NN_TORCH': [{}],
	# 'GBM': [{'extra_trees': True, 'ag_args': {'name_suffix': 'XT'}}, {}, {'learning_rate': 0.03, 'num_leaves': 128, 'feature_fraction': 0.9, 'min_data_in_leaf': 3, 'ag_args': {'name_suffix': 'Large', 'priority': 0, 'hyperparameter_tune_kwargs': None}}],
	'CAT': [{}],
	# 'XGB': [{}],
	'FASTAI': [{}],
	'RF': [{'criterion': 'gini', 'ag_args': {'name_suffix': 'Gini', 'problem_types': ['binary', 'multiclass']}}, {'criterion': 'entropy', 'ag_args': {'name_suffix': 'Entr', 'problem_types': ['binary', 'multiclass']}}, {'criterion': 'squared_error', 'ag_args': {'name_suffix': 'MSE', 'problem_types': ['regression', 'quantile']}}],
	'XT': [{'criterion': 'gini', 'ag_args': {'name_suffix': 'Gini', 'problem_types': ['binary', 'multiclass']}}, {'criterion': 'entropy', 'ag_args': {'name_suffix': 'Entr', 'problem_types': ['binary', 'multiclass']}}, {'criterion': 'squared_error', 'ag_args': {'name_suffix': 'MSE', 'problem_types': ['regression', 'quantile']}}],
	'KNN': [{'weights': 'uniform', 'ag_args': {'name_suffix': 'Unif'}}, {'weights': 'distance', 'ag_args': {'name_suffix': 'Dist'}}],
}

predictor = (
  TabularPredictor(
    label='loan_status',
    path='AutogluonModels/final'
  )
  .fit(
    train_data,
    hyperparameters=hyperparameters,
    presets='optimize_for_deployment'
  )
)
```

The training was quite fast due to small data size. The trained model was saved under `AutogluonModels/final` folder. The trained model was evaluated against test dataset with below performance result.

```python
{'accuracy': 0.8850574712643678,
 'balanced_accuracy': 0.5435064935064935,
 'mcc': 0.185184647595632,
 'roc_auc': 0.5701298701298704,
 'f1': 0.16666666666666666,
 'precision': 0.5,
 'recall': 0.1}
```

Based on the predictor leaderboard, the models kept are NeuralNetFastAI and WeightedEnsemble_L2.

### Step 8: App Development

The web app was created using Flask framework with Pico CSS due to its ease of use. This app consisted of a form to collect the input which will be used to predict the loan status whether it will be paid off. The form was created using FlaskForm due to its native integration with Flask app framework.

{% include figure.liquid loading="eager" path="assets/img/loan-prediction-app/app_screenshot_expanded.png" class="img-fluid rounded z-depth-1" alt="Application Screenshot with Expanded Sections" %}

After filling up the form and clicking the "Predict loan status!" button, the app will use the trained model to predict the loan status.

{% include figure.liquid loading="eager" path="assets/img/loan-prediction-app/app_screenshot_loan_prediction.png" class="img-fluid rounded z-depth-1" alt="Application Screenshot with Loan Prediction" %}

### Step 9: App Deployment

Initially, I tried to make this app serverless using AWS SAM (zip method). However, the app size was too big due to the inclusion of the AutoGluon library. Next, I tried to deploy this app on Digital Ocean using both zip and Docker methods, but both failed. The zip method failed due to Python library incompatibility. The Docker method failed because the health check was unable to reach the container port. Eventually, I found the Render platform from Reddit threads.

{% include figure.liquid loading="eager" path="assets/img/loan-prediction-app/render_platform.png" class="img-fluid rounded z-depth-1" alt="Render Platform" %}

I followed this documentation [Render Deploy Flask](https://render.com/docs/deploy-flask){:target="\_blank"} to deploy my app. Then, I followed this documentation [Custom Domains on Render](https://render.com/docs/custom-domains){:target="\_blank"} to add my domain.

Now the app is reachable from [here](https://loan-prediction-app.vincentcys.com/){:target="\_blank"}! 🎉

## Afterthoughts

I took about 4 months to complete this project due to other personal commitments. At the end of this project, I felt satisfied that I had learned a lot: RDS, Flask, AutoML, and Serverless App development.

**Lessons Learned**

- How to provision RDS
- How to build Machine Learning model from Relational Database
- How to create Flask app
- How to use AutoML
- How to create a Serverless App using AWS SAM

**Future Enhancements**

- Improve app UI & UX
- Improve the robustness of prediction model
- Change it to serverless app by using different ML framework
