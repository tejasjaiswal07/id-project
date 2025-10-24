# GitHub Actions Deployment Guide for AWS

This guide explains how to set up GitHub Actions for deploying your Next.js application to AWS using the Free Tier services.

## AWS Free Tier Services Used

This deployment setup uses the following AWS services that are available in the Free Tier:

1. **S3** - For hosting the static files (12 months free, 5GB storage)
2. **CloudFront** - For content delivery network (12 months free, 50GB data transfer)
3. **Lambda** - For serverless API functions (Always free tier: 1M requests/month)
4. **API Gateway** - For API routing (12 months free: 1M API calls/month)

## Prerequisites

Before you can use the GitHub Actions workflows, you need to set up the following:

### 1. AWS Resources Setup

1. Create an S3 bucket for hosting your website
2. Configure the S3 bucket for static website hosting
3. Create a CloudFront distribution pointing to your S3 bucket
4. Set up appropriate IAM permissions

### 2. GitHub Repository Secrets

Add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions):

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `AWS_REGION`: The AWS region (e.g., us-east-1)
- `AWS_S3_BUCKET`: Your S3 bucket name
- `AWS_CLOUDFRONT_DISTRIBUTION_ID`: Your CloudFront distribution ID (optional)

## Setting Up AWS Resources

### S3 Bucket Setup

1. Go to the AWS Management Console and navigate to S3
2. Create a new bucket with a unique name
3. In bucket properties, enable "Static website hosting"
4. Set the index document to "index.html" and error document to "404.html"
5. Add a bucket policy to allow public read access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

### CloudFront Setup

1. Go to CloudFront in the AWS Console
2. Create a new distribution
3. Set the origin domain to your S3 website endpoint
4. Configure the following settings:
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Allowed HTTP methods: GET, HEAD
   - Cache policy: CachingOptimized
   - Origin request policy: CORS-S3Origin
5. Set the default root object to "index.html"
6. For SPAs, set up error pages to redirect to index.html

### IAM User Setup

1. Go to IAM in the AWS Console
2. Create a new user for GitHub Actions
3. Attach the following policies:
   - AmazonS3FullAccess (or a more restricted custom policy)
   - CloudFrontFullAccess (or a more restricted custom policy)
4. Generate access keys and securely store them

## Next.js Configuration for Static Export

Update your `next.config.js` file to include:

```js
module.exports = {
  // ... your other config
  output: 'export',
  images: {
    unoptimized: true, // For static export
  },
}
```

## Workflows

This repository contains two GitHub Actions workflows:

1. **Deploy to AWS** (`deploy.yml`):
   - Triggers on pushes to main/master branches
   - Builds and deploys your application to AWS S3
   - Invalidates CloudFront cache for immediate updates
   - Can be manually triggered from the Actions tab

2. **Cleanup Temporary Files** (`cleanup.yml`):
   - Runs daily at 1 AM
   - Cleans up temporary files to keep the repository lightweight
   - Can be manually triggered from the Actions tab

## Troubleshooting

If you encounter issues with the deployment:

1. Check the GitHub Actions logs for errors
2. Verify that all required secrets are set correctly
3. Ensure your IAM user has the necessary permissions
4. Check your S3 bucket policy and CloudFront configuration
5. Make sure your Next.js application is properly configured for static export

## Cost Management

While the AWS Free Tier is generous, monitor your usage to avoid unexpected charges:

1. Set up AWS Budgets to alert you when approaching free tier limits
2. Regularly check the AWS Billing Dashboard
3. Consider setting up AWS Cost Explorer to track costs by service
