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

{% include figure.liquid loading="eager" path="assets/img/loan-prediction-app/dataset_schema.svg" class="img-fluid rounded z-depth-1" alt="Architecture" %}

## Step 2: Download Dataset

I used MySQL Workbench to connect to the CTU Relational database and exported the dataset in SQL dump format.

## Step 3: Setting up RDS Instance

Next, I created a db.t4g.micro instance running MariaDB. I set up a EC2 instance as a bastion host to connect to the RDS instance because the RDS instance is provisioned in private network. This is best practice as RDS instance should not be reachable over public network. I connected to the RDS instance and uploaded the dataset.

## Step 4: EDA

To create the machine learning model, I need to first understand the dataset and what can be used as features. I performed EDA using Jupyter notebook which can be found at [here](https://github.com/cyshen11/loan-prediction-app-aws/blob/main/jupyter-nb/EDA.ipynb){:target="\_blank"}. I used my device to connect to the EC2 instance to connect to the RDS instance. This method only works for querying small size of data. This means that only aggregation and dataset preview is feasible.

**Loan Amount by Status**

{% include figure.liquid loading="eager" path="assets/img/loan-prediction-app/loan_amount_by_status.png" class="img-fluid rounded z-depth-1" alt="Architecture" %}

## Step 5: Export Data from RDS to S3

To train the model on the dataset, all the dataset is exported from RDS to S3. A database snapshot is created. Then the database snapshot data is exported to a S3 bucket.

## Step 6: Creating Features
