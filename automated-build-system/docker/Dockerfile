# Android Build Environment
FROM openjdk:11-jdk-slim

# Set environment variables
ENV ANDROID_SDK_ROOT /opt/android-sdk
ENV ANDROID_HOME /opt/android-sdk
ENV PATH $PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools

# Install required packages
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    git \
    build-essential \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Android SDK
RUN mkdir -p $ANDROID_SDK_ROOT/cmdline-tools && \
    curl -o cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip && \
    unzip cmdline-tools.zip -d $ANDROID_SDK_ROOT/cmdline-tools && \
    mv $ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools $ANDROID_SDK_ROOT/cmdline-tools/latest && \
    rm cmdline-tools.zip

# Accept Android SDK licenses
RUN yes | sdkmanager --licenses

# Install Android SDK components
RUN sdkmanager "platform-tools" \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "extras;android;m2repository" \
    "extras;google;m2repository"

# Install Gradle
RUN curl -o gradle.zip https://services.gradle.org/distributions/gradle-8.0-bin.zip && \
    unzip gradle.zip -d /opt && \
    mv /opt/gradle-8.0 /opt/gradle && \
    rm gradle.zip

ENV PATH $PATH:/opt/gradle/bin

# Create working directory
WORKDIR /workspace

# Copy build scripts
COPY scripts/build-android.sh /usr/local/bin/build-android.sh
RUN chmod +x /usr/local/bin/build-android.sh

# Default command
CMD ["build-android.sh"] 