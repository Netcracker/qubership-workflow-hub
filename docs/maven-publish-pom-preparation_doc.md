# Prepare your project to publish into Maven Central

This documentation provides the instruction how to change project's `pom.xml` file to be able to publish artifacts into Maven Central.

---

## POM file required changes

### Mandatory maven central properties

Add following entries under `project` section (see [maven central requirements](https://central.sonatype.org/publish/requirements/) for more info). Make sure to update description, `url` and `scm` sections according to your project details.

```xml
    <name>${project.groupId}:${project.artifactId}</name>
    <description>Your project description</description>
    <url>https://github.com/Netcracker/your-repository</url>
    <licenses>
        <license>
            <name>Apache License, Version 2.0</name>
            <url>https://www.apache.org/licenses/LICENSE-2.0</url>
        </license>
    </licenses>
    <developers>
        <developer>
            <name>Netcracker</name>
            <email>opensourcegroup@netcracker.com</email>
            <organization>Netcracker Technology</organization>
            <organizationUrl>https://www.netcracker.com</organizationUrl>
        </developer>
    </developers>
    <scm>
         <connection>scm:git:git://github.com/Netcracker/your-repository.git</connection>
         <developerConnection>scm:git:ssh://github.com:Netcracker/your-repository.git</developerConnection>
         <url>https://github.com/Netcracker/your-repository/tree/main</url>
    </scm>
```

### Profiles

Under `project` add a new section `profiles` to manage deployment destination Maven Central or GitHub packages. Do not forget to change `REPOSITORY_NAME` in the code below to your repository name.

```xml
    <profiles>
        <profile>
            <id>central</id>
            <activation>
                <activeByDefault>false</activeByDefault>
            </activation>
            <build>
                <plugins>
                    <plugin>
                        <groupId>org.sonatype.central</groupId>
                        <artifactId>central-publishing-maven-plugin</artifactId>
                        <version>0.6.0</version>
                        <extensions>true</extensions>
                        <configuration>
                            <publishingServerId>central</publishingServerId>
                            <autoPublish>true</autoPublish>
                            <waitUntil>published</waitUntil>
                        </configuration>
                    </plugin>
                </plugins>
            </build>
            <distributionManagement>
                <repository>
                    <id>central</id>
                    <name>Central Maven Repository</name>
                </repository>
            </distributionManagement>
        </profile>

        <profile>
            <id>github</id>
            <activation>
                <activeByDefault>false</activeByDefault>
            </activation>
            <distributionManagement>
                <repository>
                    <id>github</id>
                    <name>GitHub Packages</name>
                    <url>https://maven.pkg.github.com/Netcracker/REPOSITORY_NAME</url>
                </repository>
            </distributionManagement>
        </profile>
    </profiles>
```

### Build plugins

In a section `project.build.plugins` add next entries:

```xml
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-gpg-plugin</artifactId>
                <version>3.2.7</version>
                <executions>
                    <execution>
                        <id>sign-artifacts</id>
                        <phase>verify</phase>
                        <goals>
                            <goal>sign</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>

            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-source-plugin</artifactId>
                <version>3.3.0</version>
                <executions>
                    <execution>
                        <id>attach-sources</id>
                        <goals>
                            <goal>jar-no-fork</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>

            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-javadoc-plugin</artifactId>
                <version>3.6.3</version>
                <executions>
                    <execution>
                        <id>attach-javadocs</id>
                        <goals>
                            <goal>jar</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
```
