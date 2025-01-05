---
layout: post
title: 'Building a Simple Supply Chain Web App'
date: 2015-01-05
permalink: /building-a-supply-chain-app/
---

I wanted to learn more about data science in supply chain, particularly in inventory optimization and demand forecasting, so I decided to build a web app and deploy it on the cloud, with CI/CD setup. Here's how I did it.

![App screenshot]({{site.url}}/images/supply-chain-app/app_screenshot.png)

### [App](https://inventory-opt-demand-forecast.vincentcys.com/){:target="\_blank"}

### [GitHub](https://github.com/cyshen11/inventory-management-demand-forecast){:target="\_blank"}

&nbsp;

## Tech Stack

- Frontend: Streamlit
- Backend: Nginx
- Cloud: AWS EC2
- Tools: Darts
- CI/CD: GitHub Actions, Docker, Pytest, Streamlit AppTest

&nbsp;
&nbsp;

## Architecture

![Architecture]({{site.url}}/images/supply-chain-app/architecture.png)

&nbsp;
&nbsp;

## Step 1: Preparing datasets

Firstly, I need the product demand and lead time datasets for simulating the inventory and predicting the demand. For the product demand, I was able to find a decent sample dataset at [Kaggle](https://www.kaggle.com/datasets/felixzhao/productdemandforecasting){:target="\_blank"} (Credits to Felixzhao). This dataset consists of the daily product demand with their product code, warehouse, and product category.

![Product Demand Sample Dataset]({{site.url}}/images/supply-chain-app/demand_data.png)

For the lead time data, I wrote a [script](https://github.com/cyshen11/inventory-management-demand-forecast/blob/main/data/scripts/python/generate_lead_time.py){:target="\_blank"} to generate synthetic lead time dataset based on the product demand sample dataset.

&nbsp;
&nbsp;

## Step 2: Developing the application

There are 5 main functionalities for this application:

- Visualizing demand trend and lead time distributions
- Calculating supply chain metrics
- Simulating inventory on actual demand
- Forecasting demand
- Uploading custom demand trend and lead time datasets

### Visualizing demand trend and lead time distributions

I started by developing the filters to allow user to choose the product and year. The year is based on the `Date` field in the product demand sample dataset.

![Filters Screenshot]({{site.url}}/images/supply-chain-app/filters.png)

After that, I developed the charts to plot the demand trend and lead time distributions.

![Charts Screenshot]({{site.url}}/images/supply-chain-app/charts.png)

### Calculating supply chain metrics (inventory optimization)

After looking at the trend and distribution, now the user will have a good idea of what is happening. To enable users to perform inventory optimization, I then move on to implement functions to compute the supply chain metrics (`economic order quantity`, `safety stock` and `reorder point`). These functionalities will automatically calculate these metrics based on the product demand and lead time data after user selected the product code and year. They also allow user to adjust the inputs.

For the `Economic Order Quantity`, the default value for `Demand per year` is the total demand based on the product code and year that user selected. The default values for other inputs are arbitrary numbers.

![Economic Order Quantity Screenshot]({{site.url}}/images/supply-chain-app/eoq.png)

For the `Safety Stock` and `Reorder Point`, I referenced the Basic, Average - Max, Cycle Service Rate formulas from [here](https://abcsupplychain.com/safety-stock-formula-calculation/){:target="\_blank"} (Credits to Edouard Thieuleux) and Fill Rate, Holding/Stockout Cost formulas from [here](https://or.stackexchange.com/questions/5589/safety-stock-with-fill-rate-criterion#:~:text=However,%20when%20using%20the%20fill,rate%20%CE%B2%20and%20the%20demand){:target="\_blank"}. The default values for `Average Daily Sales` and `Lead Time (days)` are the average daily product demand, average lead time (days) based on the product code and year that user selected.

![Safety Stock and Reorder Point Screenshot]({{site.url}}/images/supply-chain-app/ss.png)

### Simulating inventory on actual demand

With the supply chain metrics ready, I wanted to verify them through simulation. User need to select the year to simulate. Then, user need to specify the `Safety Stock`, `Reorder Point`, `Order Quantity` based on the values calculated previously. The default value for `Average Lead Time (days)` is the average lead time (days) based on the product code and year that user selected. Upon providing all the inputs, a line chart will appear to simulate the daily inventory quantity and product demand in the year.

![Simulation Inventory on Actual Demand]({{site.url}}/images/supply-chain-app/simulation_actual.png)

Besides simulating the inventory quantity, I also added the simulation on YTD Fill Rate metric and trend.

![Simulation YTD Fill Rate and Trend]({{site.url}}/images/supply-chain-app/simulation_fill_rate.png)

### Forecasting demand

Another main feature of this application is to forecast demand. I designed the application to allow users to validate the models based on past data before forecasting the future. There are 3 forecasting horizons, `Day`, `Week`, `Month`. The model is forecasting in a rolling manner. For example if `Week` horizon is selected and the week to predict is 2016 Week 2, the model will use 2015 Week 2 - 2016 Week 1 actual data as training data. Subsequently, for 2016 Week 3, the model will use 2015 Week 3 - 2016 Week 2 actual data as training data.

There are 8 forecasting models, `Naive Drift`, `Naive Moving Average`, `ARIMA`, `Exponential Smoothing`, `Theta`, `Kalman Filter`, `Linear Regression` and `Random Forest`. I didn't include neural network models because I didn't want to pay for GPU cloud computing (and I felt that they would be overkill). I used the `Darts` library for implementing these forecasting models because they provide a consistent way to use various forecasting models, like scikit-learn.

For hyperparameters tuning, the hyperparameters are automatically tuned for each forecast. I used the `StatsForecast` implementation for `ARIMA`, `Exponential Smoothing` and `Theta` to automatically choose the hyperparameters. For `Linear Regression` and `Random Forest`, I specified the parameters grid and used `gridsearch` method.

Here's the exact Darts models I have used:

- NaiveDrift
- NaiveMovingAverage
- StatsForecastAutoARIMA
- StatsForecastAutoETS
- StatsForecastAutoTheta
- KalmanForecaster
- LinearRegressionModel
- RandomForest

Mean Absolute Error (MAE) and Mean Absolute Percentage Error (MAPE) were computed for the models' forecast and compared to the baseline model (Naive Drift). The forecast is plotted over the actual demand.

![Forecast Screenshot]({{site.url}}/images/supply-chain-app/forecast.png)

When multiple models are selected, their MAE and MAPE results will be added to a table for comparison.

![Models Result Table Screenshot]({{site.url}}/images/supply-chain-app/models_result.png)

The forecast can be used for inventory simulation similarly as actual demand.

If user select the latest year, the model will forecast 1 day/week/month for the subsequent year.

![Forecast for Future Screenshot]({{site.url}}/images/supply-chain-app/simulation_forecast_future.png)

### Uploading custom demand trend and lead time datasets

I wanted the app to be more than just a proof-of-concept, so I added the ability for users to upload their own data.

Upon clicking `Upload Data`, user can download the file templates for demand and lead time, input the values and upload them to this application.

![Upload Data Screenshot]({{site.url}}/images/supply-chain-app/upload.png)

User can delete their uploaded data.

![Delete Uploaded Data Screenshot]({{site.url}}/images/supply-chain-app/delete_uploaded_data.png)

&nbsp;
&nbsp;

## Step 3: Writing Unit Tests and Setting Up Continuous Integration (CI)

To automatically test the application and ensure future code integrates well, I wrote unit tests using Pytest and Streamlit AppTest. I used AI assistant, Amazon Q to generate the test code because it is free now. Sometimes, I used Claude for more complicated tests.

![Unit Tests Result]({{site.url}}/images/supply-chain-app/unit_tests_result.png)

For CI, I used GitHub Actions and wrote the workflow [here](https://github.com/cyshen11/inventory-management-demand-forecast/blob/main/.github/workflows/python-app.yml){:target="\_blank"}. This workflow will run the unit test when the `main` branch is being pulled or pushed.

![Continuous Integration Screenshot]({{site.url}}/images/supply-chain-app/ci.png)

&nbsp;
&nbsp;

## Step 4: Deploying the Application and Setting Up Continuous Deployment (CD)

I deployed the application to EC2 using Docker. Before deploying, I prepared this [Dockerfile](https://github.com/cyshen11/inventory-management-demand-forecast/blob/main/Dockerfile){:target="\_blank"} based on this [guide](https://johnardavies.github.io/technical/front_end/){:target="\_blank"} Step 2 (Credits to John Davies). GitHub Actions will use this Dockerfile to build a container image of the application.

Next, I launch an EC2 instance with medium size, Ubuntu OS and EBS (28 GB). I tested various instance sizes and found these specs to be the minimum to run my application without crashing. After that, I configured the EC2 instance's security groups to allow inbound HTTPS, HTTP and SSH traffic. I installed Docker on the EC2.

For CD, I used GitHub Actions and wrote the workflow [here](https://github.com/cyshen11/inventory-management-demand-forecast/blob/main/.github/workflows/cd.yml){:target="\_blank"}. This workflow will perform below actions when the `main` branch is pushed. I also set up Actions secrets for this workflow. Refer to this [guide](https://johnardavies.github.io/technical/front_end/){:target="\_blank"} Step 4 for more details on setting up CD pipeline.

1. Build the container image
2. Upload to Docker Hub
3. SSH to EC2
4. Stop running container
5. Delete existing containers and images
6. Download the new container image from Docker Hub
7. Run the container image

![Continuous Deployment Screenshot]({{site.url}}/images/supply-chain-app/cd.png)

&nbsp;
&nbsp;

## Step 5: Assigning subdomain to the EC2

After the deployment, I wanted to route my subdomain to the EC2. I allocated an elastic IP address to the EC2 instance to ensure a static IP address. Then, I added the IP address to my subdomain records.

Currently, the Streamlit application is running on port 8501. Hence, I need to setup a webserver to perform reverse proxy from port 443 to 8501 because user will be accessing this application from port 443 (HTTPS) through web browser.

Before setting up the web server, I uploaded my SSL certs to the EC2 as they are part of the prerequisites. If you are using Cloudflare, you can follow this [guide](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/){:target="\_blank"} on how to get your SSL certs. Next, I installed NGINX on the EC2. I followed this [guide](https://medium.com/@linux.franklin/streamlit-with-nginx-a-step-by-step-guide-to-setting-up-your-data-app-on-a-custom-domain-7f5da2d4b3be){:target="\_blank"} on setting up and starting the NGINX. However, this guide's configuration file is for HTTP (port 80). I modified my configuration file based on this [NGINX docmentation](https://nginx.org/en/docs/http/configuring_https_servers.html){:target="\_blank"} to configure for HTTPS server.

Now, when user browse to [https://inventory-opt-demand-forecast.vincentcys.com/](https://inventory-opt-demand-forecast.vincentcys.com/){:target="\_blank"}, they will see the application!

![App screenshot]({{site.url}}/images/supply-chain-app/app_screenshot.png)

&nbsp;
&nbsp;

## Step 6: Setting up alarm to monitor failed EC2 instances

I wanted to be notified if the EC2 instance failed. I setup a Cloudwatch to monitor the EC2 failed instances metric. Next, I setup a SNS with my email address as the subscriber. Upon failure, the Cloudwatch will trigger the SNS to email my email address.

![Cloudwatch Alarm]({{site.url}}/images/supply-chain-app/alarm.png)

&nbsp;
&nbsp;

## Afterthoughts

I took 3 weeks to develop this application. At the end of this project, I felt satisfied and excited about my accomplishment. There's still tons of room for improvement.

During my development, I made a few mistakes that ended up taking more time. Firstly, I wrote the unit test to test all the models which caused long testing duration. I updated it to test only a subset of models. For EC2 instance, I initially deploy it on small instance size and the application ran too slow. I allocated too small EBS storage which caused container deployment failed because the Docker image file size is quite huge. Eventually, I found the minimum instance size and storage required.

**Lessons Learned**

- How to calculate safety stock
- How to forecast demand
- How to write unit tests
- How to deploy Streamlit application to EC2
- How to setup Streamlit application continuous deployment to EC2
- How to route subdomain to EC2

**Future Enhancements**

- Improve UI/UX
- Include inventory costing in the simulation

&nbsp;
&nbsp;

## References

Sample Dataset

- Felixzhao, [Forecasts for Product Demand](https://www.kaggle.com/datasets/felixzhao/productdemandforecasting){:target="\_blank"}

Safety Stock Calculation Formulas

- Edouard Thieuleux, [Safety Stock Formula & Calculations](https://abcsupplychain.com/safety-stock-formula-calculation/){:target="\_blank"}
- [Safety Stock with Fill Rate Criterion](https://or.stackexchange.com/questions/5589/safety-stock-with-fill-rate-criterion){:target="\_blank"}

Deployment

- John Davies, [Introduction to deploying an app with simple CI/CD](https://johnardavies.github.io/technical/front_end/){:target="\_blank"}
- Benjamin Franklin. S, [Streamlit with Nginx: A Step-by-Step Guide to Setting up Your Data App on a Custom Domain](https://medium.com/@linux.franklin/streamlit-with-nginx-a-step-by-step-guide-to-setting-up-your-data-app-on-a-custom-domain-7f5da2d4b3be){:target="\_blank"}
- Cloudflare, [Origin CA certificates](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/){:target="\_blank"}
- NGINX, [Configuring HTTPS servers](https://nginx.org/en/docs/http/configuring_https_servers.html){:target="\_blank"}
