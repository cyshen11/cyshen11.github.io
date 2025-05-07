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

Flask is chosen for frontend as it is a popular app building framework for Python. RDS is chosen for the database as it is also a popular platform to deploy database. MariaDB variant is chosen due to my own familiarity. AutoGluon is chosen as the AutoML framework due to its popularity. Render is chosen as the deployment platform due to its low cost, and it includes recent Python libraries.

&nbsp;
&nbsp;

## Architecture

{% include figure.liquid loading="eager" path="assets/img/loan-prediction-app/architecture.png" class="img-fluid rounded z-depth-1" alt="Architecture" %}

&nbsp;
&nbsp;

## Step 1: Searching for Open Source Data

I started by searching available data for this project. I found the PKDD'99 Financial dataset from [CTU Relational Dataset Repository](https://relational.fel.cvut.cz/dataset/Financial){:target="\_blank"}. This dataset consists of 606 successful and 76 not successful loans along with their information and transactions. There are 8 tables in this dataset. For this project, this dataset is filtered to only finished loans.

{% include figure.liquid loading="eager" path="assets/img/loan-prediction-app/dataset_schema.svg" class="img-fluid rounded z-depth-1" alt="Dataset Schema" %}

## Step 2: Download Dataset

I used MySQL Workbench to connect to the CTU Relational database and exported the dataset in SQL dump format.

## Step 3: Setting up RDS Instance

Next, I created a db.t4g.micro instance running MariaDB. I set up a EC2 instance as a bastion host to connect to the RDS instance because the RDS instance is provisioned in private network. This is best practice as RDS instance should not be reachable over public network. I connected to the RDS instance and uploaded the dataset.

## Step 4: EDA

To create the machine learning model, I need to first understand the dataset and what can be used as features. I performed EDA using Jupyter notebook which can be found at [here](https://github.com/cyshen11/loan-prediction-app-aws/blob/main/jupyter-nb/EDA.ipynb){:target="\_blank"}. I used my device to connect to the EC2 instance to connect to the RDS instance. This method only works for querying small size of data. This means that only aggregation and dataset preview is feasible. EDA is performed to understand the distribution of the data, for example count of card types.

**Loan Amount by Status**

{% include figure.liquid loading="eager" path="assets/img/loan-prediction-app/loan_amount_by_status.png" class="img-fluid rounded z-depth-1" alt="EDA Loan Amount by Status" %}

## Step 5: Export Data from RDS to S3

To train the model on the dataset, all the dataset is exported from RDS to S3. A database snapshot is created. Then the database snapshot data is exported to a S3 bucket.

## Step 6: Feature Engineering

Initially, I tried to create the features myself and train the model. However, the result was not satisfactory as it always predicts that the loan will be paid off. Hence, I used the features from this [article](https://medium.com/data-science/loan-default-prediction-an-end-to-end-ml-project-with-real-bank-data-part-1-1405f7aecb9e#ed0c){:target="\_blank"} by Zhou (Joe) Xu.

The features used are as follows

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

Loan table is joined with Account, Displacement, Card, Client, District, Transaction, and Orders tables to create the features.

{% include figure.liquid loading="eager" path="assets/img/loan-prediction-app/dataset_with_features.png" class="img-fluid rounded z-depth-1" alt="Dataset with Features" %}

## Step 7: Model Training

The dataset with features is split into 70% (202 rows) for training and 30% (87 rows) for testing. TabularPredictor class from AutoGluon library is used to train the model with below hyperparameters.

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

The training is quite fast due to small data size. The trained model is saved under `AutogluonModels/final` folder. The trained model is evaluated against test dataset with below performance result.

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

The web app is created using Flask framework with Pico CSS due to its ease of use. This app consists of a form to collect the input which will be used to predict the loan status whether it will be paid off. The form is created using FlaskForm due to its native integration with Flask app framework.

{% include figure.liquid loading="eager" path="assets/img/loan-prediction-app/app_screenshot_expanded.png" class="img-fluid rounded z-depth-1" alt="Application Screenshot with Expanded Sections" %}
